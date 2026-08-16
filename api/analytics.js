const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_REVIEW_TOKEN = process.env.ADMIN_REVIEW_TOKEN;

const STYLES = [
  "Autocratic",
  "Charismatic",
  "Democratic",
  "Laissez-Faire",
  "Servant",
  "Situational",
  "Transactional",
  "Transformational"
];

function json(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }
  if (!ADMIN_REVIEW_TOKEN) {
    throw new Error("ADMIN_REVIEW_TOKEN is not configured.");
  }
}

function supabaseHeaders() {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json"
  };
  if (!String(SUPABASE_SERVICE_ROLE_KEY || "").startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }
  return headers;
}

async function fetchAll(path, pageSize = 1000) {
  const records = [];
  let offset = 0;

  while (true) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        ...supabaseHeaders(),
        Range: `${offset}-${offset + pageSize - 1}`
      }
    });
    const text = await response.text();
    const page = text ? JSON.parse(text) : [];
    if (!response.ok) {
      throw new Error(page?.message || page?.hint || "Supabase analytics request failed.");
    }
    records.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return records;
}

async function fetchAnswersForAttempts(attempts, chunkSize = 100) {
  const answers = [];
  const ids = attempts.map((attempt) => attempt.id).filter(Boolean);
  const answerSelect = "attempt_id,question_id,question_text,leadership_style,answer_value,scored_value";

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const filter = encodeURIComponent(`(${chunk.join(",")})`);
    answers.push(...await fetchAll(
      `assessment_answers?select=${answerSelect}&attempt_id=in.${filter}`
    ));
  }

  return answers;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(number(value) * factor) / factor;
}

function percent(value, total) {
  return total ? round((value / total) * 100, 1) : 0;
}

function mondayKey(value) {
  const date = new Date(value);
  const day = date.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + difference);
  return date.toISOString().slice(0, 10);
}

function respondentKey(attempt) {
  return attempt.respondent_id || String(attempt.email || attempt.respondent_label || attempt.id).toLowerCase();
}

function qualityFlags(attempt) {
  const supplied = Array.isArray(attempt.response_quality?.classificationFlags)
    ? attempt.response_quality.classificationFlags
    : [];
  const flags = [...supplied];
  if (number(attempt.straight_line_ratio) >= 0.85) flags.push("Straight-line response pattern");
  if (number(attempt.neutral_ratio) >= 0.85) flags.push("Mostly neutral responses");
  if (number(attempt.extreme_ratio) >= 0.85 && number(attempt.response_variance) < 0.5) {
    flags.push("Low-variation extreme response pattern");
  }
  return [...new Set(flags)];
}

function aggregateAttempts(attempts) {
  const interpretable = attempts.filter((attempt) => attempt.is_interpretable && attempt.primary_styles?.length);
  const respondentGroups = new Map();
  const styleDistribution = Object.fromEntries(STYLES.map((style) => [style, 0]));
  const scoreTotals = Object.fromEntries(STYLES.map((style) => [style, { sum: 0, count: 0, min: null, max: null }]));
  const weekly = new Map();
  let flaggedAttempts = 0;

  attempts.forEach((attempt) => {
    const key = respondentKey(attempt);
    if (!respondentGroups.has(key)) respondentGroups.set(key, []);
    respondentGroups.get(key).push(attempt);

    const styles = attempt.primary_styles || [];
    const allocation = styles.length ? 1 / styles.length : 0;
    styles.forEach((style) => {
      if (styleDistribution[style] !== undefined) styleDistribution[style] += allocation;
    });

    STYLES.forEach((style) => {
      const score = Number(attempt.scores?.[style]);
      if (!Number.isFinite(score)) return;
      const item = scoreTotals[style];
      item.sum += score;
      item.count += 1;
      item.min = item.min === null ? score : Math.min(item.min, score);
      item.max = item.max === null ? score : Math.max(item.max, score);
    });

    const week = mondayKey(attempt.completed_at || attempt.created_at);
    if (!weekly.has(week)) weekly.set(week, { week, attempts: 0, interpretable: 0, flagged: 0 });
    const weekItem = weekly.get(week);
    weekItem.attempts += 1;
    if (attempt.is_interpretable) weekItem.interpretable += 1;
    const hasFlags = qualityFlags(attempt).length > 0;
    if (hasFlags) {
      weekItem.flagged += 1;
      flaggedAttempts += 1;
    }
  });

  const respondents = [...respondentGroups.entries()].map(([key, group]) => {
    const ordered = group.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const latest = ordered[ordered.length - 1];
    const first = ordered[0];
    const scoreChanges = Object.fromEntries(STYLES.map((style) => [
      style,
      number(latest.scores?.[style]) - number(first.scores?.[style])
    ]));
    return {
      key,
      respondentId: latest.respondent_id,
      name: latest.respondent_label || "Unknown respondent",
      email: latest.email || "",
      attempts: ordered.length,
      firstAttempt: first.created_at,
      latestAttempt: latest.created_at,
      latestStyles: latest.primary_styles || [],
      scoreChanges,
      flaggedAttempts: ordered.filter((attempt) => qualityFlags(attempt).length).length
    };
  }).sort((a, b) => b.attempts - a.attempts || new Date(b.latestAttempt) - new Date(a.latestAttempt));

  return {
    summary: {
      totalAttempts: attempts.length,
      uniqueRespondents: respondentGroups.size,
      interpretableAttempts: interpretable.length,
      interpretableRate: percent(interpretable.length, attempts.length),
      dualStyleAttempts: attempts.filter((attempt) => attempt.primary_styles?.length === 2).length,
      unassignedAttempts: attempts.filter((attempt) => !attempt.is_interpretable || !attempt.primary_styles?.length).length,
      flaggedAttempts,
      flaggedRate: percent(flaggedAttempts, attempts.length),
      repeatRespondents: respondents.filter((respondent) => respondent.attempts > 1).length,
      averageQuestions: round(attempts.reduce((sum, attempt) => sum + number(attempt.questions_asked), 0) / (attempts.length || 1), 1)
    },
    styleDistribution: STYLES.map((style) => ({
      style,
      allocatedAttempts: round(styleDistribution[style], 1),
      percent: percent(styleDistribution[style], interpretable.length)
    })).sort((a, b) => b.allocatedAttempts - a.allocatedAttempts),
    styleScores: STYLES.map((style) => ({
      style,
      average: scoreTotals[style].count ? round(scoreTotals[style].sum / scoreTotals[style].count, 1) : 0,
      minimum: scoreTotals[style].min,
      maximum: scoreTotals[style].max
    })).sort((a, b) => b.average - a.average),
    weeklyTrend: [...weekly.values()].sort((a, b) => a.week.localeCompare(b.week)),
    respondents,
    recentAttempts: attempts.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100).map((attempt) => ({
      id: attempt.id,
      createdAt: attempt.created_at,
      name: attempt.respondent_label || "Unknown respondent",
      email: attempt.email || "",
      primaryStyles: attempt.primary_styles || [],
      isInterpretable: Boolean(attempt.is_interpretable),
      questionsAsked: attempt.questions_asked,
      scores: attempt.scores || {},
      flags: qualityFlags(attempt)
    }))
  };
}

function aggregateAnswers(answers) {
  const likert = Object.fromEntries([1, 2, 3, 4, 5].map((value) => [value, 0]));
  const questions = new Map();

  answers.forEach((answer) => {
    const value = number(answer.answer_value);
    if (likert[value] !== undefined) likert[value] += 1;
    const key = answer.question_id;
    if (!questions.has(key)) {
      questions.set(key, {
        questionId: key,
        text: answer.question_text,
        style: answer.leadership_style,
        values: []
      });
    }
    questions.get(key).values.push(value);
  });

  const itemStats = [...questions.values()].map((question) => {
    const count = question.values.length;
    const average = question.values.reduce((sum, value) => sum + value, 0) / (count || 1);
    const variance = question.values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / (count || 1);
    return {
      questionId: question.questionId,
      text: question.text,
      style: question.style,
      responses: count,
      average: round(average, 2),
      standardDeviation: round(Math.sqrt(variance), 2),
      neutralRate: percent(question.values.filter((value) => value === 3).length, count)
    };
  }).sort((a, b) => b.responses - a.responses || a.style.localeCompare(b.style));

  return {
    answerCount: answers.length,
    likertDistribution: Object.entries(likert).map(([value, count]) => ({
      value: Number(value),
      count,
      percent: percent(count, answers.length)
    })),
    itemStats
  };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      json(response, 405, { error: "Method not allowed." });
      return;
    }

    assertConfigured();
    if (request.headers["x-admin-token"] !== ADMIN_REVIEW_TOKEN) {
      json(response, 401, { error: "Unauthorized." });
      return;
    }

    const url = new URL(request.url, "https://leadership-assessment.local");
    const days = url.searchParams.get("days") || "90";
    const parsedDays = days === "all" ? null : Math.max(1, Math.min(3650, number(days, 90)));
    const createdFilter = parsedDays
      ? `&created_at=gte.${encodeURIComponent(new Date(Date.now() - (parsedDays * 86400000)).toISOString())}`
      : "";
    const attemptSelect = "id,created_at,completed_at,respondent_id,respondent_label,email,primary_styles,is_interpretable,questions_asked,scores,response_quality,straight_line_ratio,neutral_ratio,extreme_ratio,response_variance";
    const attempts = await fetchAll(`assessment_attempts?select=${attemptSelect}${createdFilter}&order=created_at.desc`);
    const answers = attempts.length ? await fetchAnswersForAttempts(attempts) : [];

    json(response, 200, {
      generatedAt: new Date().toISOString(),
      filter: { days: parsedDays || "all" },
      ...aggregateAttempts(attempts),
      ...aggregateAnswers(answers)
    });
  } catch (error) {
    console.error("Analytics request failed.", error);
    json(response, 500, { error: error.message || "Analytics request failed." });
  }
};
