process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
process.env.ADMIN_REVIEW_TOKEN = "test-admin-token";

const attempts = [
  {
    id: "attempt-1",
    created_at: "2026-08-01T12:00:00.000Z",
    completed_at: "2026-08-01T12:10:00.000Z",
    respondent_id: "respondent-1",
    respondent_label: "Test Person",
    email: "test@example.com",
    primary_styles: ["Transformational"],
    is_interpretable: true,
    questions_asked: 40,
    scores: { Transformational: 11, Democratic: 4 },
    response_quality: {},
    straight_line_ratio: 0.2,
    neutral_ratio: 0.1,
    extreme_ratio: 0.3,
    response_variance: 1.2
  },
  {
    id: "attempt-2",
    created_at: "2026-08-08T12:00:00.000Z",
    completed_at: "2026-08-08T12:09:00.000Z",
    respondent_id: "respondent-1",
    respondent_label: "Test Person",
    email: "test@example.com",
    primary_styles: ["Democratic", "Situational"],
    is_interpretable: true,
    questions_asked: 40,
    scores: { Transformational: 5, Democratic: 10, Situational: 10 },
    response_quality: { classificationFlags: ["Review response consistency"] },
    straight_line_ratio: 0.4,
    neutral_ratio: 0.2,
    extreme_ratio: 0.3,
    response_variance: 1.1
  }
];

const answers = [
  { attempt_id: "attempt-1", question_id: "q1", question_text: "I communicate a clear vision.", leadership_style: "Transformational", answer_value: 5, scored_value: 3 },
  { attempt_id: "attempt-2", question_id: "q1", question_text: "I communicate a clear vision.", leadership_style: "Transformational", answer_value: 3, scored_value: 0 },
  { attempt_id: "attempt-2", question_id: "q2", question_text: "I invite input before decisions.", leadership_style: "Democratic", answer_value: 4, scored_value: 1 }
];

global.fetch = async (url) => ({
  ok: true,
  text: async () => JSON.stringify(url.includes("assessment_attempts") ? attempts : answers)
});

const handler = require("../api/analytics.js");

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; }
  };
}

async function run() {
  const unauthorized = responseRecorder();
  await handler({ method: "GET", headers: {}, url: "/api/analytics?days=all" }, unauthorized);
  if (unauthorized.statusCode !== 401) throw new Error("Unauthorized analytics request was not rejected.");

  const response = responseRecorder();
  await handler({
    method: "GET",
    headers: { "x-admin-token": "test-admin-token" },
    url: "/api/analytics?days=all"
  }, response);
  const payload = JSON.parse(response.body);

  if (response.statusCode !== 200) throw new Error(payload.error || "Analytics endpoint did not return 200.");
  if (payload.summary.totalAttempts !== 2) throw new Error("Attempt total is incorrect.");
  if (payload.summary.uniqueRespondents !== 1 || payload.summary.repeatRespondents !== 1) {
    throw new Error("Respondent aggregation is incorrect.");
  }
  if (payload.summary.flaggedAttempts !== 1) throw new Error("Quality flag aggregation is incorrect.");
  if (payload.answerCount !== 3 || payload.itemStats.length !== 2) {
    throw new Error("Question analytics are incorrect.");
  }
  const transformational = payload.styleDistribution.find((item) => item.style === "Transformational");
  if (transformational.allocatedAttempts !== 1) throw new Error("Primary style allocation is incorrect.");

  console.log("Analytics smoke test passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
