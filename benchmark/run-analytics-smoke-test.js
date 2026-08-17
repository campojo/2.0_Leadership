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

const requestedUrls = [];
global.fetch = async (url) => {
  requestedUrls.push(url);
  return {
  ok: true,
  text: async () => JSON.stringify(url.includes("assessment_attempts") ? attempts : answers)
  };
};

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

  requestedUrls.length = 0;
  const customResponse = responseRecorder();
  await handler({
    method: "GET",
    headers: { "x-admin-token": "test-admin-token" },
    url: "/api/analytics?from=2026-08-10T04%3A00%3A00.000Z&to=2026-08-14T04%3A00%3A00.000Z"
  }, customResponse);
  const customPayload = JSON.parse(customResponse.body);
  const attemptRequest = decodeURIComponent(requestedUrls.find((url) => url.includes("assessment_attempts")) || "");
  if (customResponse.statusCode !== 200 || !attemptRequest.includes("created_at=gte.2026-08-10T04:00:00.000Z")) {
    throw new Error("Custom analytics start boundary was not applied.");
  }
  if (!attemptRequest.includes("created_at=lt.2026-08-14T04:00:00.000Z")) {
    throw new Error("Custom analytics end boundary was not applied.");
  }
  if (customPayload.filter.from !== "2026-08-10T04:00:00.000Z") {
    throw new Error("Custom analytics range was not returned.");
  }

  const respondentResponse = responseRecorder();
  await handler({
    method: "GET",
    headers: { "x-admin-token": "test-admin-token" },
    url: "/api/analytics?days=all&detail=respondent&id=respondent-1"
  }, respondentResponse);
  const respondentPayload = JSON.parse(respondentResponse.body);
  if (respondentPayload.detail.attempts.length !== 2 || respondentPayload.detail.attempts[0].answers.length !== 2) {
    throw new Error("Respondent history detail is incomplete.");
  }

  const questionResponse = responseRecorder();
  await handler({
    method: "GET",
    headers: { "x-admin-token": "test-admin-token" },
    url: "/api/analytics?days=all&detail=question&id=q1"
  }, questionResponse);
  const questionPayload = JSON.parse(questionResponse.body);
  if (questionPayload.detail.responses !== 2 || questionPayload.detail.responseHistory.length !== 2) {
    throw new Error("Question history detail is incomplete.");
  }
  if (questionPayload.detail.reviewStatus !== "Insufficient sample") {
    throw new Error("Question alert minimum sample was not enforced.");
  }

  for (let index = 0; index < 30; index += 1) {
    const attemptId = `alert-attempt-${index}`;
    attempts.push({
      ...attempts[0],
      id: attemptId,
      respondent_id: `alert-respondent-${index}`,
      scores: { Transactional: 15 }
    });
    answers.push({
      attempt_id: attemptId,
      question_id: "q-alert",
      question_text: "I use clear rewards for performance.",
      leadership_style: "Transactional",
      answer_value: 5,
      scored_value: 3
    });
  }
  const alertResponse = responseRecorder();
  await handler({
    method: "GET",
    headers: { "x-admin-token": "test-admin-token" },
    url: "/api/analytics?days=all&detail=question&id=q-alert"
  }, alertResponse);
  const alertPayload = JSON.parse(alertResponse.body);
  if (alertPayload.detail.reviewStatus !== "Review suggested") {
    throw new Error("Question review alert was not issued at the minimum sample.");
  }
  if (!alertPayload.detail.alerts.includes("Low response variation") || !alertPayload.detail.alerts.includes("Possible agreement ceiling effect")) {
    throw new Error("Question review alert reasons are incomplete.");
  }

  console.log("Analytics smoke test passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
