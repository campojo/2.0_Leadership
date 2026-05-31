const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_REVIEW_TOKEN = process.env.ADMIN_REVIEW_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESULT_EMAIL_FROM = process.env.RESULT_EMAIL_FROM;
const { randomUUID } = require("crypto");

function json(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function supabaseRequest(path, options = {}) {
  assertConfigured();
  const headers = {
    ...supabaseHeaders(),
    ...(options.headers || {})
  };
  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined) delete headers[key];
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.hint || "Supabase request failed.";
    throw new Error(message);
  }

  return data;
}

function validateAttempt(payload) {
  if (!payload || typeof payload !== "object") {
    return "Request body must be an assessment payload.";
  }
  if (!payload.id) return "Attempt id is required.";
  if (!payload.respondent?.name && !payload.respondentLabel) {
    return "Respondent name is required.";
  }
  if (!payload.respondent?.email) {
    return "Respondent email is required.";
  }
  if (!Array.isArray(payload.answers) || !payload.answers.length) {
    return "At least one answer is required.";
  }
  if (!payload.scores || typeof payload.scores !== "object") {
    return "Scores are required.";
  }
  return null;
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function isEmailConfigured() {
  return Boolean(RESEND_API_KEY && RESULT_EMAIL_FROM);
}

async function findRespondentByEmail(email) {
  if (!email) return null;
  const encodedEmail = encodeURIComponent(email);
  const rows = await supabaseRequest(`respondents?email=eq.${encodedEmail}&select=id&limit=1`, {
    method: "GET",
    headers: { Prefer: undefined }
  });
  return rows?.[0]?.id || null;
}

async function createRespondent(payload) {
  const respondent = payload.respondent || {};
  const rows = await supabaseRequest("respondents", {
    method: "POST",
    body: JSON.stringify({
      id: randomUUID(),
      respondent_label: respondent.name || payload.respondentLabel || "Unknown respondent",
      email: respondent.email || null,
      metadata: {
        source: "leadership-assessment",
        first_attempt_id: payload.id
      }
    })
  });
  return rows[0].id;
}

async function upsertRespondent(payload) {
  const email = payload.respondent?.email?.trim() || "";
  const existingId = await findRespondentByEmail(email);
  if (existingId) return existingId;
  return createRespondent(payload);
}

function attemptRow(payload, respondentId) {
  const quality = payload.quality || {};
  return {
    id: payload.id,
    created_at: payload.createdAt || new Date().toISOString(),
    completed_at: new Date().toISOString(),
    respondent_id: respondentId,
    respondent_label: payload.respondent?.name || payload.respondentLabel || null,
    email: payload.respondent?.email || null,
    primary_styles: payload.primaryStyles || [],
    confidence: payload.confidence || "Unclassified",
    is_interpretable: Boolean(quality.isInterpretable && payload.primaryStyles?.length),
    questions_asked: payload.questionsAsked || payload.answers?.length || 0,
    scores: payload.scores || {},
    response_quality: quality,
    straight_line_ratio: quality.straightLineRatio ?? null,
    neutral_ratio: quality.neutralRatio ?? null,
    extreme_ratio: quality.extremeRatio ?? null,
    response_variance: quality.variance ?? null,
    derived_ratio: quality.derivedRatio ?? null,
    result_summary: payload.resultSummary || "",
    full_result: payload
  };
}

function answerRows(payload) {
  return payload.answers.map((answer, index) => ({
    attempt_id: payload.id,
    question_id: answer.questionId,
    question_text: answer.text,
    leadership_style: answer.style,
    answer_value: answer.value,
    scored_value: answer.score,
    direction: answer.direction,
    is_derived: Boolean(answer.derived),
    derived_from: answer.derivedFrom || null,
    asked_order: index + 1,
    answered_at: payload.createdAt || new Date().toISOString()
  }));
}

async function saveAttempt(payload) {
  const respondentId = await upsertRespondent(payload);

  await supabaseRequest("assessment_attempts", {
    method: "POST",
    body: JSON.stringify(attemptRow(payload, respondentId))
  });

  await supabaseRequest("assessment_answers", {
    method: "POST",
    body: JSON.stringify(answerRows(payload))
  });

  return { attemptId: payload.id, respondentId };
}

function textResultEmail(payload) {
  const respondentName = payload.respondent?.name || payload.respondentLabel || "there";
  const resultTitle = payload.primaryStyles?.length
    ? `${payload.primaryStyles.join(" + ")} Leadership`
    : "No Leadership Style Assigned";
  const scoreLines = Object.entries(payload.scores || {})
    .sort((a, b) => b[1] - a[1])
    .map(([style, score]) => `${style}: ${score}/100`)
    .join("\n");

  return [
    `Hi ${respondentName},`,
    "",
    "Here are your leadership assessment results.",
    "",
    `Result: ${resultTitle}`,
    "",
    payload.resultSummary || "",
    "",
    "Score profile:",
    scoreLines,
    "",
    "This assessment is intended for leadership reflection and development. No leadership style is inherently better than another; effective leadership depends on context, adaptability, and the needs of the people being led."
  ].join("\n");
}

async function emailResult(payload) {
  if (!isEmailConfigured()) {
    throw new Error("Result email environment variables are not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESULT_EMAIL_FROM,
      to: payload.respondent.email,
      subject: "Your leadership assessment results",
      text: textResultEmail(payload)
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Result email failed.");
  }

  return data;
}

async function listAttempts(request) {
  if (!ADMIN_REVIEW_TOKEN) {
    return { status: 501, payload: { error: "Admin review token is not configured." } };
  }

  const suppliedToken = request.headers["x-admin-token"];
  if (suppliedToken !== ADMIN_REVIEW_TOKEN) {
    return { status: 401, payload: { error: "Unauthorized." } };
  }

  const attempts = await supabaseRequest(
    "assessment_attempts?select=id,created_at,respondent_label,email,primary_styles,is_interpretable,questions_asked,scores,response_quality,result_summary&order=created_at.desc&limit=100",
    {
      method: "GET",
      headers: { Prefer: undefined }
    }
  );

  return { status: 200, payload: { attempts } };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "POST") {
      const payload = await readBody(request);
      const validationError = validateAttempt(payload);
      if (validationError) {
        json(response, 400, { error: validationError });
        return;
      }

      const result = { saved: false, emailed: false };

      if (isSupabaseConfigured()) {
        Object.assign(result, await saveAttempt(payload), { saved: true });
      }

      if (isEmailConfigured()) {
        await emailResult(payload);
        result.emailed = true;
      }

      if (!result.saved && !result.emailed) {
        json(response, 501, { error: "No database or email provider is configured." });
        return;
      }

      json(response, 201, { ok: true, ...result });
      return;
    }

    if (request.method === "GET") {
      const result = await listAttempts(request);
      json(response, result.status, result.payload);
      return;
    }

    response.setHeader("Allow", "GET, POST");
    json(response, 405, { error: "Method not allowed." });
  } catch (error) {
    json(response, 500, { error: error.message || "Unexpected server error." });
  }
};
