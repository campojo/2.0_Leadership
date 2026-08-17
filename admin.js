const state = {
  token: sessionStorage.getItem("leadershipAdminToken") || "",
  data: null,
  view: "overview"
};

const styles = [
  "Autocratic",
  "Charismatic",
  "Democratic",
  "Laissez-Faire",
  "Servant",
  "Situational",
  "Transactional",
  "Transformational"
];

const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#loginForm");
const adminToken = document.querySelector("#adminToken");
const loginError = document.querySelector("#loginError");
const dashboardError = document.querySelector("#dashboardError");
const loadingState = document.querySelector("#loadingState");
const dateRange = document.querySelector("#dateRange");
const customDateControls = document.querySelector("#customDateControls");
const startDate = document.querySelector("#startDate");
const endDate = document.querySelector("#endDate");
const lastUpdated = document.querySelector("#lastUpdated");
const tabs = Array.from(document.querySelectorAll(".admin-tabs button"));
const views = Array.from(document.querySelectorAll(".admin-view"));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value, includeTime = false) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds))) return "Not recorded";
  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function answerLabel(value) {
  return ({ 1: "Strongly disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly agree" })[value] || "Unknown";
}

function profileLabel(primaryStyles, interpretable = true) {
  return interpretable && primaryStyles?.length ? primaryStyles.join(" + ") : "No profile assigned";
}

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setDefaultCustomDates() {
  if (startDate.value && endDate.value) return;
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  startDate.value = localDateValue(monday);
  endDate.value = localDateValue(today);
}

function analyticsUrl() {
  if (dateRange.value !== "custom") {
    return `/api/analytics?days=${encodeURIComponent(dateRange.value)}`;
  }
  if (!startDate.value || !endDate.value) throw new Error("Choose both a start and end date.");
  if (startDate.value > endDate.value) throw new Error("The start date must be on or before the end date.");
  const from = new Date(`${startDate.value}T00:00:00`).toISOString();
  const through = new Date(`${endDate.value}T00:00:00`);
  through.setDate(through.getDate() + 1);
  return `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(through.toISOString())}`;
}

function detailUrl(type, id) {
  return `${analyticsUrl()}&detail=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

async function fetchDetail(type, id) {
  const response = await fetch(detailUrl(type, id), { headers: { "x-admin-token": state.token } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Detail could not be loaded.");
  return data.detail;
}

function showLogin(message = "") {
  state.token = "";
  sessionStorage.removeItem("leadershipAdminToken");
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
  loginError.textContent = message;
  adminToken.value = "";
}

function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
}

async function loadAnalytics() {
  loadingState.classList.remove("hidden");
  views.forEach((view) => view.classList.add("hidden"));
  dashboardError.classList.add("hidden");

  try {
    const response = await fetch(analyticsUrl(), {
      headers: { "x-admin-token": state.token }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin("The admin token was not accepted.");
      return;
    }
    if (!response.ok) throw new Error(data.error || "Analytics could not be loaded.");
    state.data = data;
    renderAll();
    loadingState.classList.add("hidden");
    showView(state.view);
    lastUpdated.textContent = `Updated ${formatDate(data.generatedAt, true)}`;
  } catch (error) {
    loadingState.classList.add("hidden");
    dashboardError.textContent = error.message;
    dashboardError.classList.remove("hidden");
  }
}

function renderMetrics() {
  const summary = state.data.summary;
  document.querySelector("#totalAttempts").textContent = summary.totalAttempts;
  document.querySelector("#uniqueRespondents").textContent = summary.uniqueRespondents;
  document.querySelector("#interpretableRate").textContent = formatPercent(summary.interpretableRate);
  document.querySelector("#flaggedRate").textContent = formatPercent(summary.flaggedRate);
  document.querySelector("#repeatRespondents").textContent = summary.repeatRespondents;
  document.querySelector("#questionAlerts").textContent = state.data.itemStats.filter((item) => item.reviewStatus === "Review suggested").length;
}

function renderStyleDistribution() {
  const maximum = Math.max(1, ...state.data.styleDistribution.map((item) => item.allocatedAttempts));
  document.querySelector("#styleDistribution").innerHTML = state.data.styleDistribution.map((item) => `
    <div class="distribution-row">
      <span>${escapeHtml(item.style)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.allocatedAttempts / maximum) * 100}%"></div></div>
      <strong>${item.allocatedAttempts}</strong>
    </div>
  `).join("");
}

function renderStyleScores() {
  document.querySelector("#styleScores").innerHTML = state.data.styleScores.map((item) => `
    <div class="score-row">
      <span>${escapeHtml(item.style)}</span>
      <div class="score-line"><span class="score-marker" style="left:${Math.max(0, Math.min(100, ((item.average + 15) / 30) * 100))}%"></span></div>
      <strong>${item.average > 0 ? "+" : ""}${item.average}</strong>
    </div>
  `).join("");
}

function renderTrend() {
  const data = state.data.weeklyTrend;
  const host = document.querySelector("#trendChart");
  if (!data.length) {
    host.innerHTML = `<p class="empty-row">No assessments in this period.</p>`;
    return;
  }
  const width = 1000;
  const height = 210;
  const inset = 34;
  const maximum = Math.max(1, ...data.map((item) => item.attempts));
  const points = data.map((item, index) => ({
    ...item,
    x: data.length === 1 ? width / 2 : inset + ((index / (data.length - 1)) * (width - (inset * 2))),
    y: height - inset - ((item.attempts / maximum) * (height - (inset * 2)))
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${inset},${height - inset} ${line} ${width - inset},${height - inset}`;
  const labels = points.filter((point, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0);
  host.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Weekly assessment activity">
      ${[0, 0.5, 1].map((ratio) => `<line class="trend-grid" x1="${inset}" y1="${inset + (ratio * (height - inset * 2))}" x2="${width - inset}" y2="${inset + (ratio * (height - inset * 2))}"></line>`).join("")}
      <polygon class="trend-area" points="${area}"></polygon>
      <polyline class="trend-line" points="${line}"></polyline>
      ${points.map((point) => `<circle class="trend-point" cx="${point.x}" cy="${point.y}" r="5"><title>${point.week}: ${point.attempts} attempts</title></circle>`).join("")}
      ${labels.map((point) => `<text class="trend-label" x="${point.x}" y="${height - 6}" text-anchor="middle">${point.week.slice(5)}</text>`).join("")}
    </svg>`;
}

function renderQuality() {
  const summary = state.data.summary;
  document.querySelector("#qualitySummary").innerHTML = `
    <article><span>Assigned profiles</span><strong>${summary.interpretableAttempts}</strong></article>
    <article><span>Unassigned profiles</span><strong>${summary.unassignedAttempts}</strong></article>
    <article><span>Dual-style profiles</span><strong>${summary.dualStyleAttempts}</strong></article>
    <article><span>Average questions</span><strong>${summary.averageQuestions}</strong></article>`;
}

function renderAttempts(filter = "") {
  const query = filter.trim().toLowerCase();
  const attempts = state.data.recentAttempts.filter((attempt) => [
    attempt.name,
    attempt.email,
    ...(attempt.primaryStyles || [])
  ].join(" ").toLowerCase().includes(query));
  document.querySelector("#attemptRows").innerHTML = attempts.length ? attempts.map((attempt) => `
    <tr>
      <td>${formatDate(attempt.createdAt, true)}</td>
      <td><strong>${escapeHtml(attempt.name)}</strong><span class="subtle">${escapeHtml(attempt.email)}</span></td>
      <td>${escapeHtml(profileLabel(attempt.primaryStyles, attempt.isInterpretable))}</td>
      <td>${attempt.questionsAsked}</td>
      <td><span class="status-label ${attempt.flags.length ? "warning" : ""}">${attempt.flags.length ? `${attempt.flags.length} signal${attempt.flags.length === 1 ? "" : "s"}` : "No flags"}</span></td>
      <td><button class="row-command" type="button" data-attempt-id="${escapeHtml(attempt.id)}">View</button></td>
    </tr>
  `).join("") : `<tr><td class="empty-row" colspan="6">No matching attempts.</td></tr>`;
}

async function renderAttemptDetail(attemptId) {
  const attempt = state.data.recentAttempts.find((item) => item.id === attemptId);
  if (!attempt) return;
  const detail = document.querySelector("#attemptDetail");
  detail.classList.remove("hidden");
  detail.innerHTML = `<p class="subtle">Loading full attempt...</p>`;
  try {
    const respondent = await fetchDetail("respondent", attempt.respondentId);
    const fullAttempt = respondent.attempts.find((item) => item.id === attemptId);
    if (!fullAttempt) throw new Error("Attempt details were not found.");
  detail.innerHTML = `
    <header><div><h3>${escapeHtml(attempt.name)}</h3><span class="subtle">${escapeHtml(attempt.email)} | ${formatDate(attempt.createdAt, true)} | ${formatDuration(fullAttempt.durationSeconds)}</span></div><button id="closeAttemptDetail" type="button">Close</button></header>
    <p><strong>${escapeHtml(profileLabel(attempt.primaryStyles, attempt.isInterpretable))}</strong></p>
    <div class="detail-score-grid">${styles.map((style) => `<span>${escapeHtml(style)} <strong>${Number(attempt.scores?.[style] || 0) > 0 ? "+" : ""}${Number(attempt.scores?.[style] || 0)}</strong></span>`).join("")}</div>
    ${attempt.flags.length ? `<ul class="flag-list">${attempt.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : `<p class="subtle">No response-quality flags were recorded.</p>`}
    ${renderAnswerTable(fullAttempt.answers)}`;
  } catch (error) {
    detail.innerHTML = `<header><h3>Attempt detail</h3><button id="closeAttemptDetail" type="button">Close</button></header><p class="admin-error">${escapeHtml(error.message)}</p>`;
  }
}

function renderAnswerTable(answers) {
  return `<div class="detail-section"><h4>Questions and answers</h4><div class="table-frame"><table class="answer-history"><thead><tr><th>#</th><th>Question</th><th>Style</th><th>Answer</th><th>Score</th><th>Time</th></tr></thead><tbody>${answers.map((answer) => `<tr><td>${answer.askedOrder}</td><td>${escapeHtml(answer.text)}</td><td>${escapeHtml(answer.style)}</td><td>${answerLabel(answer.answerValue)}</td><td>${Number(answer.scoredValue) > 0 ? "+" : ""}${answer.scoredValue}</td><td>${answer.responseTimeMs === null ? "Not recorded" : formatDuration(answer.responseTimeMs / 1000)}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function renderRespondents(filter = "") {
  const query = filter.trim().toLowerCase();
  const respondents = state.data.respondents.filter((respondent) => `${respondent.name} ${respondent.email}`.toLowerCase().includes(query));
  document.querySelector("#respondentRows").innerHTML = respondents.length ? respondents.map((respondent) => `
    <tr>
      <td><strong>${escapeHtml(respondent.name)}</strong><span class="subtle">${escapeHtml(respondent.email)}</span></td>
      <td>${respondent.attempts}</td>
      <td>${escapeHtml(profileLabel(respondent.latestStyles))}</td>
      <td>${formatDate(respondent.firstAttempt)}</td>
      <td>${formatDate(respondent.latestAttempt)}</td>
      <td>${respondent.flaggedAttempts}</td><td><button class="row-command" type="button" data-respondent-id="${escapeHtml(respondent.respondentId)}">History</button></td>
    </tr>
  `).join("") : `<tr><td class="empty-row" colspan="7">No matching respondents.</td></tr>`;
}

async function renderRespondentDetail(respondentId) {
  const host = document.querySelector("#respondentDetail");
  host.classList.remove("hidden");
  host.innerHTML = `<p class="subtle">Loading respondent history...</p>`;
  try {
    const detail = await fetchDetail("respondent", respondentId);
    host.innerHTML = `
      <header><div><h3>${escapeHtml(detail.name)}</h3><span class="subtle">${escapeHtml(detail.email)} | ${detail.attempts.length} assessment${detail.attempts.length === 1 ? "" : "s"}</span></div><button id="closeRespondentDetail" type="button">Close</button></header>
      ${detail.attempts.map((attempt, index) => `<section class="detail-attempt"><h4>${index === 0 ? "Latest assessment" : `Earlier assessment ${detail.attempts.length - index}`} | ${formatDate(attempt.createdAt, true)}</h4><p><strong>${escapeHtml(profileLabel(attempt.primaryStyles, attempt.isInterpretable))}</strong> | Total time: ${formatDuration(attempt.durationSeconds)}</p><div class="detail-score-grid">${styles.map((style) => `<span>${escapeHtml(style)} <strong>${Number(attempt.scores?.[style] || 0) > 0 ? "+" : ""}${Number(attempt.scores?.[style] || 0)}</strong></span>`).join("")}</div>${renderAnswerTable(attempt.answers)}</section>`).join("")}`;
  } catch (error) {
    host.innerHTML = `<header><h3>Respondent history</h3><button id="closeRespondentDetail" type="button">Close</button></header><p class="admin-error">${escapeHtml(error.message)}</p>`;
  }
}

function renderItems(filter = "") {
  const query = filter.trim().toLowerCase();
  const items = state.data.itemStats.filter((item) => `${item.text} ${item.style}`.toLowerCase().includes(query));
  document.querySelector("#itemRows").innerHTML = items.length ? items.map((item) => `
    <tr>
      <td>${escapeHtml(item.text)}</td>
      <td>${escapeHtml(item.style)}</td>
      <td>${item.responses}</td>
      <td>${item.average}</td>
      <td>${item.standardDeviation}</td>
      <td>${formatPercent(item.neutralRate)}</td>
      <td class="${item.reviewStatus === "Review suggested" ? "review-signal" : "sample-note"}">${escapeHtml(item.reviewStatus)}</td>
      <td><button class="row-command" type="button" data-question-id="${escapeHtml(item.questionId)}">History</button></td>
    </tr>
  `).join("") : `<tr><td class="empty-row" colspan="8">No matching questions.</td></tr>`;
  const labels = { 1: "Strongly disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly agree" };
  document.querySelector("#likertDistribution").innerHTML = state.data.likertDistribution.map((item) => `
    <article><span>${labels[item.value]}</span><strong>${formatPercent(item.percent)}</strong></article>
  `).join("");
}

async function renderQuestionDetail(questionId) {
  const host = document.querySelector("#questionDetail");
  host.classList.remove("hidden");
  host.innerHTML = `<p class="subtle">Loading question history...</p>`;
  try {
    const detail = await fetchDetail("question", questionId);
    const alerts = detail.alerts.length
      ? `<ul class="flag-list">${detail.alerts.map((alert) => `<li>${escapeHtml(alert)}</li>`).join("")}</ul>`
      : `<p class="sample-note">No review signals currently meet the alert thresholds.</p>`;
    host.innerHTML = `
      <header><div><h3>${escapeHtml(detail.text)}</h3><span class="subtle">${escapeHtml(detail.style)} | ${detail.responses} responses</span></div><button id="closeQuestionDetail" type="button">Close</button></header>
      <div class="quality-summary"><article><span>Average</span><strong>${detail.average}</strong></article><article><span>Variation</span><strong>${detail.standardDeviation}</strong></article><article><span>Neutral</span><strong>${formatPercent(detail.neutralRate)}</strong></article><article><span>Corrected item-total relationship</span><strong>${detail.correctedItemTotalCorrelation === null ? "Not available" : detail.correctedItemTotalCorrelation}</strong></article></div>
      <p class="sample-note">The corrected item-total relationship compares this answer with the remaining score for its assigned style. Values below 0.20 are flagged for expert review. Treat all signals as preliminary while response counts are small.</p>
      ${alerts}
      <div class="detail-section"><h4>Response history</h4><div class="table-frame"><table class="answer-history"><thead><tr><th>Date</th><th>Respondent</th><th>Answer</th><th>Score</th><th>Time</th></tr></thead><tbody>${detail.responseHistory.map((response) => `<tr><td>${formatDate(response.date, true)}</td><td>${escapeHtml(response.name)}<span class="subtle">${escapeHtml(response.email)}</span></td><td>${answerLabel(response.answerValue)}</td><td>${Number(response.scoredValue) > 0 ? "+" : ""}${response.scoredValue}</td><td>${response.responseTimeMs === null ? "Not recorded" : formatDuration(response.responseTimeMs / 1000)}</td></tr>`).join("")}</tbody></table></div></div>`;
  } catch (error) {
    host.innerHTML = `<header><h3>Question history</h3><button id="closeQuestionDetail" type="button">Close</button></header><p class="admin-error">${escapeHtml(error.message)}</p>`;
  }
}

function renderAll() {
  renderMetrics();
  renderStyleDistribution();
  renderStyleScores();
  renderTrend();
  renderQuality();
  renderAttempts(document.querySelector("#attemptSearch").value);
  renderRespondents(document.querySelector("#respondentSearch").value);
  renderItems(document.querySelector("#itemSearch").value);
}

function showView(viewName) {
  state.view = viewName;
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  views.forEach((view) => view.classList.toggle("hidden", view.id !== `${viewName}View`));
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.token = adminToken.value.trim();
  if (!state.token) return;
  sessionStorage.setItem("leadershipAdminToken", state.token);
  showDashboard();
  await loadAnalytics();
});

tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
document.querySelector("#refreshButton").addEventListener("click", loadAnalytics);
document.querySelector("#logoutButton").addEventListener("click", () => showLogin());
dateRange.addEventListener("change", () => {
  const isCustom = dateRange.value === "custom";
  customDateControls.classList.toggle("hidden", !isCustom);
  if (isCustom) {
    setDefaultCustomDates();
  } else {
    loadAnalytics();
  }
});
document.querySelector("#applyDateRange").addEventListener("click", loadAnalytics);
document.querySelector("#attemptSearch").addEventListener("input", (event) => renderAttempts(event.target.value));
document.querySelector("#respondentSearch").addEventListener("input", (event) => renderRespondents(event.target.value));
document.querySelector("#itemSearch").addEventListener("input", (event) => renderItems(event.target.value));
document.querySelector("#attemptRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-attempt-id]");
  if (button) renderAttemptDetail(button.dataset.attemptId);
});
document.querySelector("#respondentRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-respondent-id]");
  if (button) renderRespondentDetail(button.dataset.respondentId);
});
document.querySelector("#itemRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-id]");
  if (button) renderQuestionDetail(button.dataset.questionId);
});
document.querySelector("#attemptDetail").addEventListener("click", (event) => {
  if (event.target.id === "closeAttemptDetail") event.currentTarget.classList.add("hidden");
});
document.querySelector("#respondentDetail").addEventListener("click", (event) => {
  if (event.target.id === "closeRespondentDetail") event.currentTarget.classList.add("hidden");
});
document.querySelector("#questionDetail").addEventListener("click", (event) => {
  if (event.target.id === "closeQuestionDetail") event.currentTarget.classList.add("hidden");
});

if (state.token) {
  showDashboard();
  loadAnalytics();
}
