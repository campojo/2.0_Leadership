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
  const answerSelect = "attempt_id,question_id,question_text,leadership_style,answer_value,scored_value,direction,asked_order,answered_at,response_time_ms";

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

function pearsonCorrelation(pairs) {
  if (pairs.length < 3) return null;
  const xMean = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const yMean = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  let numerator = 0;
  let xSum = 0;
  let ySum = 0;
  pairs.forEach(([x, y]) => {
    const xDelta = x - xMean;
    const yDelta = y - yMean;
    numerator += xDelta * yDelta;
    xSum += xDelta ** 2;
    ySum += yDelta ** 2;
  });
  const denominator = Math.sqrt(xSum * ySum);
  return denominator ? numerator / denominator : null;
}

function mondayKey(value) {
  const date = new Date(value);
  const day = date.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + difference);
  return date.toISOString().slice(0, 10);
}

function parseDateParameter(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is not a valid date.`);
  return date;
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
      respondentId: attempt.respondent_id,
      createdAt: attempt.created_at,
      completedAt: attempt.completed_at,
      name: attempt.respondent_label || "Unknown respondent",
      email: attempt.email || "",
      primaryStyles: attempt.primary_styles || [],
      isInterpretable: Boolean(attempt.is_interpretable),
      questionsAsked: attempt.questions_asked,
      durationSeconds: attempt.duration_seconds,
      scores: attempt.scores || {},
      flags: qualityFlags(attempt)
    }))
  };
}

function aggregateAnswers(answers, attempts) {
  const likert = Object.fromEntries([1, 2, 3, 4, 5].map((value) => [value, 0]));
  const questions = new Map();
  const attemptsById = new Map(attempts.map((attempt) => [attempt.id, attempt]));

  answers.forEach((answer) => {
    const value = number(answer.answer_value);
    if (likert[value] !== undefined) likert[value] += 1;
    const key = answer.question_id;
    if (!questions.has(key)) {
      questions.set(key, {
        questionId: key,
        text: answer.question_text,
        style: answer.leadership_style,
        rows: []
      });
    }
    questions.get(key).rows.push({ ...answer, value });
  });

  const itemStats = [...questions.values()].map((question) => {
    const values = question.rows.map((row) => row.value);
    const count = values.length;
    const average = values.reduce((sum, value) => sum + value, 0) / (count || 1);
    const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / (count || 1);
    const standardDeviation = Math.sqrt(variance);
    const neutralRate = percent(values.filter((value) => value === 3).length, count);
    const highEndRate = percent(values.filter((value) => value >= 4).length, count);
    const lowEndRate = percent(values.filter((value) => value <= 2).length, count);
    const correlationPairs = question.rows.map((row) => {
      const attempt = attemptsById.get(row.attempt_id);
      const styleTotal = Number(attempt?.scores?.[question.style]);
      const itemScore = Number(row.scored_value);
      return Number.isFinite(styleTotal) && Number.isFinite(itemScore)
        ? [itemScore, styleTotal - itemScore]
        : null;
    }).filter(Boolean);
    const correlation = pearsonCorrelation(correlationPairs);
    const alerts = [];
    if (count >= 30) {
      if (standardDeviation <= 0.65) alerts.push("Low response variation");
      if (neutralRate >= 40) alerts.push("High neutral response rate");
      if (highEndRate >= 85) alerts.push("Possible agreement ceiling effect");
      if (lowEndRate >= 85) alerts.push("Possible disagreement floor effect");
      if (correlation !== null && correlation < 0.2) alerts.push("Weak corrected item-total relationship");
    }
    return {
      questionId: question.questionId,
      text: question.text,
      style: question.style,
      responses: count,
      average: round(average, 2),
      standardDeviation: round(standardDeviation, 2),
      neutralRate,
      correctedItemTotalCorrelation: correlation === null ? null : round(correlation, 2),
      reviewStatus: count < 30 ? "Insufficient sample" : alerts.length ? "Review suggested" : "Monitoring",
      alerts
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

function answerDetail(answer) {
  return {
    questionId: answer.question_id,
    text: answer.question_text,
    style: answer.leadership_style,
    answerValue: answer.answer_value,
    scoredValue: answer.scored_value,
    direction: answer.direction,
    askedOrder: answer.asked_order,
    answeredAt: answer.answered_at,
    responseTimeMs: answer.response_time_ms
  };
}

function attemptDetail(attempt, answers) {
  return {
    id: attempt.id,
    createdAt: attempt.created_at,
    completedAt: attempt.completed_at,
    durationSeconds: attempt.duration_seconds,
    primaryStyles: attempt.primary_styles || [],
    isInterpretable: Boolean(attempt.is_interpretable),
    scores: attempt.scores || {},
    flags: qualityFlags(attempt),
    answers: answers
      .filter((answer) => answer.attempt_id === attempt.id)
      .sort((a, b) => number(a.asked_order) - number(b.asked_order))
      .map(answerDetail)
  };
}

function respondentDetail(id, attempts, answers) {
  const respondentAttempts = attempts
    .filter((attempt) => attempt.respondent_id === id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latest = respondentAttempts[0];
  if (!latest) return null;
  return {
    respondentId: id,
    name: latest.respondent_label || "Unknown respondent",
    email: latest.email || "",
    attempts: respondentAttempts.map((attempt) => attemptDetail(attempt, answers))
  };
}

function questionDetail(id, attempts, answers) {
  const attemptsById = new Map(attempts.map((attempt) => [attempt.id, attempt]));
  const matching = answers.filter((answer) => answer.question_id === id);
  if (!matching.length) return null;
  const stats = aggregateAnswers(matching, attempts).itemStats[0];
  const weekly = new Map();
  const responses = matching.map((answer) => {
    const attempt = attemptsById.get(answer.attempt_id);
    const week = mondayKey(attempt?.created_at || answer.answered_at);
    if (!weekly.has(week)) weekly.set(week, { week, values: [] });
    weekly.get(week).values.push(number(answer.answer_value));
    return {
      attemptId: answer.attempt_id,
      date: attempt?.created_at || answer.answered_at,
      respondentId: attempt?.respondent_id,
      name: attempt?.respondent_label || "Unknown respondent",
      email: attempt?.email || "",
      answerValue: answer.answer_value,
      scoredValue: answer.scored_value,
      responseTimeMs: answer.response_time_ms
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
  return {
    ...stats,
    weeklyTrend: [...weekly.values()].sort((a, b) => a.week.localeCompare(b.week)).map((item) => ({
      week: item.week,
      responses: item.values.length,
      average: round(item.values.reduce((sum, value) => sum + value, 0) / item.values.length, 2)
    })),
    responseHistory: responses
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
    const from = parseDateParameter(url.searchParams.get("from"), "Start date");
    const to = parseDateParameter(url.searchParams.get("to"), "End date");
    if ((from && !to) || (!from && to)) throw new Error("Custom ranges require both start and end dates.");
    if (from && to && from >= to) throw new Error("The start date must be before the end date.");

    const days = url.searchParams.get("days") || "90";
    const parsedDays = days === "all" ? null : Math.max(1, Math.min(3650, number(days, 90)));
    const createdFilter = from && to
      ? `&created_at=gte.${encodeURIComponent(from.toISOString())}&created_at=lt.${encodeURIComponent(to.toISOString())}`
      : parsedDays
        ? `&created_at=gte.${encodeURIComponent(new Date(Date.now() - (parsedDays * 86400000)).toISOString())}`
        : "";
    const attemptSelect = "id,created_at,completed_at,respondent_id,respondent_label,email,primary_styles,is_interpretable,questions_asked,duration_seconds,scores,response_quality,straight_line_ratio,neutral_ratio,extreme_ratio,response_variance";
    const attempts = await fetchAll(`assessment_attempts?select=${attemptSelect}${createdFilter}&order=created_at.desc`);
    const answers = attempts.length ? await fetchAnswersForAttempts(attempts) : [];

    const detailType = url.searchParams.get("detail");
    const detailId = url.searchParams.get("id");
    if (detailType === "respondent" && detailId) {
      const detail = respondentDetail(detailId, attempts, answers);
      json(response, detail ? 200 : 404, detail ? { detail } : { error: "Respondent not found in this period." });
      return;
    }
    if (detailType === "question" && detailId) {
      const detail = questionDetail(detailId, attempts, answers);
      json(response, detail ? 200 : 404, detail ? { detail } : { error: "Question not found in this period." });
      return;
    }

    json(response, 200, {
      generatedAt: new Date().toISOString(),
      filter: from && to
        ? { from: from.toISOString(), throughExclusive: to.toISOString() }
        : { days: parsedDays || "all" },
      ...aggregateAttempts(attempts),
      ...aggregateAnswers(answers, attempts)
    });
  } catch (error) {
    console.error("Analytics request failed.", error);
    json(response, 500, { error: error.message || "Analytics request failed." });
  }
};
