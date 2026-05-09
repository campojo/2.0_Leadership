const MAX_QUESTIONS = 40;
const BASELINE_PER_STYLE = 2;
const MIN_LEAD_GAP = 8;
const MIN_TOP_STYLE_ANSWERS = 4;
const MAX_DERIVED_RATIO = 0.25;

const sourceData = window.LEADERSHIP_DATA;
const styles = sourceData.styles;

const derivedQuestions = [
  {
    id: "derived_transformational_001",
    style: "Transformational",
    direction: "negative",
    derived: true,
    derivedFrom: "q_transformational_001",
    text: "I rarely connect day-to-day work to a clear and inspiring future direction."
  },
  {
    id: "derived_transactional_001",
    style: "Transactional",
    direction: "negative",
    derived: true,
    derivedFrom: "q_transactional_001",
    text: "I often leave goals, expectations, or performance consequences unclear."
  },
  {
    id: "derived_servant_001",
    style: "Servant",
    direction: "negative",
    derived: true,
    derivedFrom: "q_servant_001",
    text: "I rarely prioritize understanding what my team members need in order to succeed."
  },
  {
    id: "derived_autocratic_001",
    style: "Autocratic",
    direction: "negative",
    derived: true,
    derivedFrom: "q_autocratic_001",
    text: "I avoid making firm decisions independently, even when clear direction is needed."
  },
  {
    id: "derived_charismatic_001",
    style: "Charismatic",
    direction: "negative",
    derived: true,
    derivedFrom: "q_charismatic_001",
    text: "I rarely use personal energy or presence to inspire commitment from others."
  },
  {
    id: "derived_democratic_001",
    style: "Democratic",
    direction: "negative",
    derived: true,
    derivedFrom: "q_democratic_001",
    text: "I usually make decisions without inviting input from people affected by them."
  },
  {
    id: "derived_laissez_faire_001",
    style: "Laissez-Faire",
    direction: "negative",
    derived: true,
    derivedFrom: "q_laissez_faire_001",
    text: "I tend to stay closely involved in how capable team members complete their work."
  },
  {
    id: "derived_situational_001",
    style: "Situational",
    direction: "negative",
    derived: true,
    derivedFrom: "q_situational_001",
    text: "I use the same leadership approach regardless of the person, task, or context."
  }
];

const questionBank = [...sourceData.questions, ...derivedQuestions];
const state = {
  currentQuestion: null,
  selectedValue: null,
  started: false,
  currentIndex: 0,
  questionHistory: [],
  answers: [],
  pendingQueue: [],
  complete: false
};

const startView = document.querySelector("#startView");
const assessmentView = document.querySelector("#assessmentView");
const resultsView = document.querySelector("#resultsView");
const attemptsView = document.querySelector("#attemptsView");
const progressText = document.querySelector("#progressText");
const progressPercent = document.querySelector("#progressPercent");
const progressBar = document.querySelector("#progressBar");
const dimensionLabel = document.querySelector("#dimensionLabel");
const questionCounter = document.querySelector("#questionCounter");
const questionText = document.querySelector("#questionText");
const questionHelp = document.querySelector("#questionHelp");
const backButton = document.querySelector("#backButton");
const nextButton = document.querySelector("#nextButton");
const ratingOptions = Array.from(document.querySelectorAll(".rating-option"));
const dimensionPills = Array.from(document.querySelectorAll(".dimension-pill"));
const profileTitle = document.querySelector("#profileTitle");
const profileSummary = document.querySelector("#profileSummary");
const overallScore = document.querySelector("#overallScore");
const dimensionScores = document.querySelector("#dimensionScores");
const recommendations = document.querySelector("#recommendations");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const reviewAttemptsButton = document.querySelector("#reviewAttemptsButton");
const copyButton = document.querySelector("#copyButton");
const attemptsList = document.querySelector("#attemptsList");
const backToResultsButton = document.querySelector("#backToResultsButton");
const exportAttemptsButton = document.querySelector("#exportAttemptsButton");

function hashSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0];
}

let seed = hashSeed();

function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function firstPersonQuestion(text) {
  const original = text.trim();
  if (!/^The leader\b/i.test(original)) {
    return polishSelfAssessmentText(original);
  }

  let output = original.replace(/^The leader\b/i, "I");
  const replacements = [
    ["shares", "share"],
    ["outlines", "outline"],
    ["communicates", "communicate"],
    ["sets", "set"],
    ["inspires", "inspire"],
    ["encourages", "encourage"],
    ["empowers", "empower"],
    ["drives", "drive"],
    ["challenges", "challenge"],
    ["shows", "show"],
    ["makes", "make"],
    ["engages", "engage"],
    ["takes", "take"],
    ["seeks", "seek"],
    ["promotes", "promote"],
    ["supports", "support"],
    ["values", "value"],
    ["fosters", "foster"],
    ["acknowledges", "acknowledge"],
    ["provides", "provide"],
    ["celebrates", "celebrate"],
    ["ensures", "ensure"],
    ["maintains", "maintain"],
    ["focuses", "focus"],
    ["monitors", "monitor"],
    ["uses", "use"],
    ["offers", "offer"],
    ["places", "place"],
    ["relies", "rely"],
    ["prioritizes", "prioritize"],
    ["demonstrates", "demonstrate"],
    ["adapts", "adapt"],
    ["allows", "allow"],
    ["gives", "give"],
    ["delegates", "delegate"],
    ["expects", "expect"],
    ["handles", "handle"],
    ["listens", "listen"],
    ["involves", "involve"],
    ["creates", "create"],
    ["leads", "lead"],
    ["acts", "act"],
    ["builds", "build"],
    ["refrains", "refrain"],
    ["is", "am"]
  ];

  replacements.forEach(([from, to]) => {
    output = output.replace(new RegExp(`^I(.*?)\\b${from}\\b`, "i"), `I$1${to}`);
  });

  return polishSelfAssessmentText(output);
}

function polishSelfAssessmentText(text) {
  return text
    .replace(/\bmy team members\b/gi, "__MY_TEAM_MEMBERS__")
    .replace(/\bteam members\b/gi, "my team members")
    .replace(/__MY_TEAM_MEMBERS__/g, "my team members")
    .replace(/\bmy team\b/gi, "__MY_TEAM__")
    .replace(/\bthe team\b/gi, "my team")
    .replace(/__MY_TEAM__/g, "my team")
    .replace(/\btheir own work\b/gi, "their own work");
}

function scoreAnswer(question, value) {
  if (question.direction === "negative") {
    return 6 - value;
  }
  return value;
}

function getAnswersByStyle(style) {
  return state.answers.filter((answer) => answer && answer.style === style);
}

function answeredCount() {
  return state.answers.filter(Boolean).length;
}

function calculateScores() {
  const scores = {};
  const raw = {};

  styles.forEach((style) => {
    const answers = getAnswersByStyle(style);
    const total = answers.reduce((sum, answer) => sum + answer.score, 0);
    const average = answers.length ? total / answers.length : 0;
    scores[style] = Math.round((average / 5) * 100);
    raw[style] = { count: answers.length, average, values: answers.map((answer) => answer.score) };
  });

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return { scores, raw, ranked };
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function responseQuality() {
  const completeAnswers = state.answers.filter(Boolean);
  const values = completeAnswers.map((answer) => answer.value);
  const counts = values.reduce((memo, value) => {
    memo[value] = (memo[value] || 0) + 1;
    return memo;
  }, {});
  const maxSame = Math.max(...Object.values(counts), 0);
  const straightLineRatio = values.length ? maxSame / values.length : 0;
  const variance = standardDeviation(values);
  const derivedCount = completeAnswers.filter((answer) => answer.derived).length;
  const derivedRatio = completeAnswers.length ? derivedCount / completeAnswers.length : 0;

  const flags = [];
  if (completeAnswers.length >= 12 && straightLineRatio >= 0.85) {
    flags.push("Most responses used the same answer option.");
  }
  if (completeAnswers.length >= 12 && variance < 0.45) {
    flags.push("Responses showed very low variation.");
  }
  if (derivedRatio > MAX_DERIVED_RATIO) {
    flags.push("Too many derived check questions were used.");
  }

  return { flags, straightLineRatio, variance, derivedRatio };
}

function confidenceLevel(scoresData) {
  const top = scoresData.ranked[0];
  const second = scoresData.ranked[1];
  const gap = top[1] - second[1];
  const topCount = scoresData.raw[top[0]].count;
  const quality = responseQuality();

  if (quality.flags.length) return "Lower";
  if (gap >= 12 && topCount >= MIN_TOP_STYLE_ANSWERS) return "High";
  if (gap >= MIN_LEAD_GAP && topCount >= 3) return "Moderate";
  return "Developing";
}

function buildBaselineQueue() {
  const perStyle = styles.flatMap((style) => {
    const sourceItems = sourceData.questions.filter((question) => question.style === style);
    return shuffle(sourceItems).slice(0, BASELINE_PER_STYLE);
  });

  state.pendingQueue = interleaveByStyle(shuffle(perStyle));
}

function interleaveByStyle(questions) {
  const result = [];
  const buckets = styles.reduce((memo, style) => {
    memo[style] = questions.filter((question) => question.style === style);
    return memo;
  }, {});

  while (result.length < questions.length) {
    const candidates = shuffle(styles).filter((style) => buckets[style].length);
    const nextStyle = candidates.find((style) => result[result.length - 1]?.style !== style) || candidates[0];
    result.push(buckets[nextStyle].shift());
  }

  return result;
}

function getUnusedQuestions(style, includeDerived = false) {
  const askedIds = new Set(state.questionHistory.map((question) => question.id));
  return questionBank.filter((question) => {
    if (question.style !== style || askedIds.has(question.id)) return false;
    if (!includeDerived && question.derived) return false;
    return true;
  });
}

function shouldStop() {
  if (answeredCount() < styles.length) return false;
  if (answeredCount() >= MAX_QUESTIONS) return true;

  const scoresData = calculateScores();
  const [top, second] = scoresData.ranked;
  const topCount = scoresData.raw[top[0]].count;
  const gap = top[1] - second[1];
  const quality = responseQuality();

  return topCount >= MIN_TOP_STYLE_ANSWERS && gap >= MIN_LEAD_GAP && quality.flags.length === 0;
}

function nextAdaptiveQuestion() {
  const scoresData = calculateScores();
  const ranked = scoresData.ranked;
  const topStyles = ranked.slice(0, 3).map(([style]) => style);
  const lowestCoverage = styles
    .map((style) => ({ style, count: scoresData.raw[style].count }))
    .sort((a, b) => a.count - b.count)[0];

  if (lowestCoverage.count < 1) {
    return shuffle(getUnusedQuestions(lowestCoverage.style))[0];
  }

  const inconsistent = styles
    .map((style) => {
      const values = scoresData.raw[style].values;
      return { style, spread: values.length ? Math.max(...values) - Math.min(...values) : 0 };
    })
    .filter((item) => item.spread >= 4)
    .sort((a, b) => b.spread - a.spread)[0];

  if (inconsistent) {
    const derived = getUnusedQuestions(inconsistent.style, true).find((question) => question.derived);
    if (derived && responseQuality().derivedRatio < 0.18) return derived;
    return shuffle(getUnusedQuestions(inconsistent.style))[0];
  }

  const closeStyles = topStyles.filter((style) => getUnusedQuestions(style).length);
  const targetStyle = closeStyles.find((style) => scoresData.raw[style].count < 5) || closeStyles[0];
  if (targetStyle) {
    return shuffle(getUnusedQuestions(targetStyle))[0];
  }

  return null;
}

function advanceQuestion() {
  if (shouldStop()) {
    renderResults();
    return;
  }

  const queued = state.pendingQueue.shift();
  const next = queued || nextAdaptiveQuestion();

  if (!next || state.answers.length >= MAX_QUESTIONS) {
    renderResults();
    return;
  }

  state.currentQuestion = next;
  state.questionHistory.push(next);
  state.currentIndex = state.questionHistory.length - 1;
  renderQuestion();
}

function renderQuestion() {
  const question = state.questionHistory[state.currentIndex];
  const existingAnswer = state.answers[state.currentIndex] || null;
  const progress = Math.min(Math.round((answeredCount() / MAX_QUESTIONS) * 100), 100);

  state.currentQuestion = question;
  state.selectedValue = existingAnswer ? existingAnswer.value : null;
  progressText.textContent = `Question ${state.currentIndex + 1} of up to ${MAX_QUESTIONS}`;
  progressPercent.textContent = `${progress}%`;
  progressBar.style.width = `${Math.max(progress, 4)}%`;
  dimensionLabel.textContent = "Assessment Item";
  questionCounter.textContent = `${state.currentIndex + 1}`;
  questionText.textContent = firstPersonQuestion(question.text);
  questionHelp.textContent = "Choose the response that best describes your typical leadership behavior.";
  backButton.disabled = state.currentIndex === 0;
  nextButton.disabled = state.selectedValue === null;
  nextButton.textContent = state.currentIndex === state.questionHistory.length - 1 && answeredCount() >= MAX_QUESTIONS
    ? "See Results"
    : "Next";

  ratingOptions.forEach((option) => {
    const selected = Number(option.dataset.value) === state.selectedValue;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-pressed", String(selected));
  });

  dimensionPills.forEach((pill) => pill.classList.remove("active"));
}

function answerCurrent(value) {
  const question = state.currentQuestion;
  const score = scoreAnswer(question, value);

  state.answers[state.currentIndex] = {
    questionId: question.id,
    text: firstPersonQuestion(question.text),
    style: question.style,
    value,
    score,
    direction: question.direction,
    derived: Boolean(question.derived),
    derivedFrom: question.derivedFrom || null
  };

  state.selectedValue = value;
}

function tendencyFor(score) {
  if (score >= 75) return "high";
  if (score >= 45) return "moderate";
  return "low";
}

function styleSummary(style, score) {
  return sourceData.scoreDescriptions[style]?.[tendencyFor(score)] || "";
}

function briefStyleSummary(style, score) {
  const summary = styleSummary(style, score);
  const firstSentence = summary.match(/^.*?[.!?](\s|$)/);
  return firstSentence ? firstSentence[0].trim() : summary;
}

function resultPayload() {
  const scoresData = calculateScores();
  const quality = responseQuality();
  const confidence = confidenceLevel(scoresData);
  const [first, second] = scoresData.ranked;
  const gap = first[1] - second[1];
  const primaryStyles = gap <= 3 && scoresData.raw[first[0]].count >= 4 && scoresData.raw[second[0]].count >= 4
    ? [first[0], second[0]]
    : [first[0]];
  const resultSummary = `Your strongest signal is ${primaryStyles.join(" + ")}. Confidence: ${confidence}. The detailed profile below explains what that style usually means, where it tends to be strong, and where it can create friction.`;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    primaryStyles,
    scores: scoresData.scores,
    confidence,
    quality,
    resultSummary,
    answers: state.answers.filter(Boolean),
    questionsAsked: answeredCount()
  };
}

function persistAttempt(payload) {
  const existing = JSON.parse(localStorage.getItem("leadershipAssessmentAttempts") || "[]");
  existing.push(payload);
  localStorage.setItem("leadershipAssessmentAttempts", JSON.stringify(existing));
}

function getSavedAttempts() {
  return JSON.parse(localStorage.getItem("leadershipAssessmentAttempts") || "[]");
}

function answerLabel(value) {
  return {
    1: "Strongly Disagree",
    2: "Disagree",
    3: "Neutral",
    4: "Agree",
    5: "Strongly Agree"
  }[value] || String(value);
}

function renderAttemptsView() {
  const attempts = getSavedAttempts().slice().reverse();

  startView.classList.add("hidden");
  assessmentView.classList.add("hidden");
  resultsView.classList.add("hidden");
  attemptsView.classList.remove("hidden");
  progressText.textContent = `${attempts.length} saved locally`;
  progressPercent.textContent = "Review";
  progressBar.style.width = "100%";

  if (!attempts.length) {
    attemptsList.innerHTML = `<p class="empty-state">No completed attempts are saved in this browser yet.</p>`;
    return;
  }

  attemptsList.innerHTML = attempts.map((attempt) => {
    const created = new Date(attempt.createdAt).toLocaleString();
    const scoreRows = Object.entries(attempt.scores)
      .sort((a, b) => b[1] - a[1])
      .map(([style, score]) => `<span>${style}: <strong>${score}</strong></span>`)
      .join("");
    const answerRows = attempt.answers
      .map((answer, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${answer.text}</td>
          <td>${answerLabel(answer.value)}</td>
          <td>${answer.score}</td>
          <td>${answer.derived ? "Derived" : "Source"}</td>
        </tr>
      `)
      .join("");

    return `
      <article class="attempt-card">
        <header>
          <div>
            <h3>${attempt.primaryStyles.join(" + ")} Leadership</h3>
            <p>${created} · ${attempt.questionsAsked} questions · ${attempt.confidence} confidence</p>
          </div>
        </header>
        <div class="score-strip">${scoreRows}</div>
        <details>
          <summary>Review questions and answers</summary>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question shown</th>
                  <th>Answer</th>
                  <th>Score</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>${answerRows}</tbody>
            </table>
          </div>
        </details>
      </article>
    `;
  }).join("");
}

function exportAttempts() {
  const payload = JSON.stringify(getSavedAttempts(), null, 2);
  navigator.clipboard.writeText(payload).then(() => {
    exportAttemptsButton.textContent = "Copied JSON";
    window.setTimeout(() => {
      exportAttemptsButton.textContent = "Export JSON";
    }, 1400);
  });
}

function renderResults() {
  state.complete = true;
  const payload = resultPayload();
  persistAttempt(payload);

  const ranked = Object.entries(payload.scores).sort((a, b) => b[1] - a[1]);
  const primaryLabel = payload.primaryStyles.join(" + ");
  const primaryScore = Math.round(payload.primaryStyles.reduce((sum, style) => sum + payload.scores[style], 0) / payload.primaryStyles.length);

  startView.classList.add("hidden");
  assessmentView.classList.add("hidden");
  attemptsView.classList.add("hidden");
  resultsView.classList.remove("hidden");
  progressText.textContent = `Complete after ${payload.questionsAsked} questions`;
  progressPercent.textContent = "100%";
  progressBar.style.width = "100%";
  profileTitle.textContent = `Likely ${primaryLabel} Leadership`;
  profileSummary.textContent = payload.resultSummary;
  overallScore.textContent = primaryScore;

  dimensionScores.innerHTML = ranked
    .map(([style, score]) => `
      <article class="score-card ${payload.primaryStyles.includes(style) ? "primary-style" : ""}">
        <header>
          <span>${style}</span>
          <strong>${score}</strong>
        </header>
        <div class="meter" aria-hidden="true"><span style="width: ${score}%"></span></div>
        <p>${briefStyleSummary(style, score)}</p>
      </article>
    `)
    .join("");

  const primaryDetails = payload.primaryStyles.flatMap((style) => {
    const qualities = sourceData.styleQualities[style] || [];
    return [
      `
        <article class="detail-card">
          <h4>${style} Leadership</h4>
          <p>${styleSummary(style, payload.scores[style])}</p>
          <div class="detail-list">
            ${qualities.slice(0, 4).map((quality) => `<p class="recommendation">${quality}</p>`).join("")}
          </div>
        </article>
      `
    ];
  });

  const lowest = ranked[ranked.length - 1];
  const qualityNotes = payload.quality.flags.length
    ? payload.quality.flags.map((flag) => `<p class="recommendation"><strong>Confidence note:</strong> ${flag}</p>`)
    : [`<p class="recommendation"><strong>Least-like style:</strong> ${lowest[0]} scored lowest at ${lowest[1]}.</p>`];

  recommendations.innerHTML = [...primaryDetails, ...qualityNotes].join("");
  window.lastAssessmentResult = payload;
}

function restartAssessment() {
  state.currentQuestion = null;
  state.selectedValue = null;
  state.started = false;
  state.currentIndex = 0;
  state.questionHistory = [];
  state.answers = [];
  state.pendingQueue = [];
  state.complete = false;
  startView.classList.remove("hidden");
  resultsView.classList.add("hidden");
  assessmentView.classList.add("hidden");
  attemptsView.classList.add("hidden");
  seed = hashSeed();
  buildBaselineQueue();
  progressText.textContent = "Ready to begin";
  progressPercent.textContent = "0%";
  progressBar.style.width = "4%";
}

function startAssessment() {
  state.started = true;
  startView.classList.add("hidden");
  assessmentView.classList.remove("hidden");
  advanceQuestion();
}

function copySummary() {
  const payload = window.lastAssessmentResult;
  if (!payload) return;

  const scoreLines = Object.entries(payload.scores)
    .sort((a, b) => b[1] - a[1])
    .map(([style, score]) => `${style}: ${score}/100`)
    .join("\n");

  const summary = `Likely ${payload.primaryStyles.join(" + ")} Leadership\nConfidence: ${payload.confidence}\nQuestions asked: ${payload.questionsAsked}\n\n${scoreLines}`;

  navigator.clipboard.writeText(summary).then(() => {
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy Summary";
    }, 1400);
  });
}

ratingOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const value = Number(option.dataset.value);
    state.selectedValue = value;
    ratingOptions.forEach((ratingOption) => {
      const selected = Number(ratingOption.dataset.value) === value;
      ratingOption.classList.toggle("selected", selected);
      ratingOption.setAttribute("aria-pressed", String(selected));
    });
    answerCurrent(value);
    nextButton.disabled = false;
  });
});

nextButton.addEventListener("click", () => {
  if (state.selectedValue === null) return;
  if (state.currentIndex < state.questionHistory.length - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }
  advanceQuestion();
});

backButton.addEventListener("click", () => {
  if (state.currentIndex === 0) return;
  state.currentIndex -= 1;
  renderQuestion();
});
startButton.addEventListener("click", startAssessment);
restartButton.addEventListener("click", restartAssessment);
reviewAttemptsButton.addEventListener("click", renderAttemptsView);
copyButton.addEventListener("click", copySummary);
backToResultsButton.addEventListener("click", () => {
  attemptsView.classList.add("hidden");
  if (window.lastAssessmentResult) {
    resultsView.classList.remove("hidden");
  } else {
    startView.classList.remove("hidden");
  }
});
exportAttemptsButton.addEventListener("click", exportAttempts);

restartAssessment();

if (window.location.hash === "#review") {
  renderAttemptsView();
}
