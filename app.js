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
  asked: [],
  answers: [],
  pendingQueue: [],
  complete: false
};

const assessmentView = document.querySelector("#assessmentView");
const resultsView = document.querySelector("#resultsView");
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
const restartButton = document.querySelector("#restartButton");
const copyButton = document.querySelector("#copyButton");

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

function styleKey(style) {
  return style.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function scoreAnswer(question, value) {
  if (question.direction === "negative") {
    return 6 - value;
  }
  return value;
}

function getQuestionById(id) {
  return questionBank.find((question) => question.id === id);
}

function getAnswersByStyle(style) {
  return state.answers.filter((answer) => answer.style === style);
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
  const values = state.answers.map((answer) => answer.value);
  const counts = values.reduce((memo, value) => {
    memo[value] = (memo[value] || 0) + 1;
    return memo;
  }, {});
  const maxSame = Math.max(...Object.values(counts), 0);
  const straightLineRatio = values.length ? maxSame / values.length : 0;
  const variance = standardDeviation(values);
  const derivedCount = state.answers.filter((answer) => answer.derived).length;
  const derivedRatio = state.answers.length ? derivedCount / state.answers.length : 0;

  const flags = [];
  if (state.answers.length >= 12 && straightLineRatio >= 0.85) {
    flags.push("Most responses used the same answer option.");
  }
  if (state.answers.length >= 12 && variance < 0.45) {
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
  const askedIds = new Set(state.asked);
  return questionBank.filter((question) => {
    if (question.style !== style || askedIds.has(question.id)) return false;
    if (!includeDerived && question.derived) return false;
    return true;
  });
}

function shouldStop() {
  if (state.answers.length < styles.length) return false;
  if (state.answers.length >= MAX_QUESTIONS) return true;

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
  state.asked.push(next.id);
  renderQuestion();
}

function renderQuestion() {
  const question = state.currentQuestion;
  const progress = Math.min(Math.round((state.answers.length / MAX_QUESTIONS) * 100), 100);

  progressText.textContent = `Question ${state.answers.length + 1} of up to ${MAX_QUESTIONS}`;
  progressPercent.textContent = `${progress}%`;
  progressBar.style.width = `${Math.max(progress, 4)}%`;
  dimensionLabel.textContent = question.style;
  questionCounter.textContent = `${state.answers.length + 1}`;
  questionText.textContent = question.text;
  questionHelp.textContent = question.derived
    ? "This reverse-framed item checks consistency with the same leadership construct."
    : "Choose the response that best describes your typical leadership behavior.";
  backButton.disabled = true;
  nextButton.disabled = true;
  nextButton.textContent = state.answers.length + 1 >= MAX_QUESTIONS ? "See Results" : "Next";

  ratingOptions.forEach((option) => {
    option.classList.remove("selected");
    option.setAttribute("aria-pressed", "false");
  });

  dimensionPills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.style === question.style);
  });
}

function answerCurrent(value) {
  const question = state.currentQuestion;
  const score = scoreAnswer(question, value);

  state.answers.push({
    questionId: question.id,
    text: question.text,
    style: question.style,
    value,
    score,
    direction: question.direction,
    derived: Boolean(question.derived),
    derivedFrom: question.derivedFrom || null
  });

  state.selectedValue = null;
  advanceQuestion();
}

function tendencyFor(score) {
  if (score >= 75) return "high";
  if (score >= 45) return "moderate";
  return "low";
}

function styleSummary(style, score) {
  return sourceData.scoreDescriptions[style]?.[tendencyFor(score)] || "";
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
  const resultSummary = `Your strongest signal is ${primaryStyles.join(" + ")}. Confidence: ${confidence}. ${styleSummary(primaryStyles[0], scoresData.scores[primaryStyles[0]])}`;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    primaryStyles,
    scores: scoresData.scores,
    confidence,
    quality,
    resultSummary,
    answers: state.answers,
    questionsAsked: state.answers.length
  };
}

function persistAttempt(payload) {
  const existing = JSON.parse(localStorage.getItem("leadershipAssessmentAttempts") || "[]");
  existing.push(payload);
  localStorage.setItem("leadershipAssessmentAttempts", JSON.stringify(existing));
}

function renderResults() {
  state.complete = true;
  const payload = resultPayload();
  persistAttempt(payload);

  const ranked = Object.entries(payload.scores).sort((a, b) => b[1] - a[1]);
  const primaryLabel = payload.primaryStyles.join(" + ");
  const primaryScore = Math.round(payload.primaryStyles.reduce((sum, style) => sum + payload.scores[style], 0) / payload.primaryStyles.length);

  assessmentView.classList.add("hidden");
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
        <p>${styleSummary(style, score)}</p>
      </article>
    `)
    .join("");

  const primaryDetails = payload.primaryStyles.flatMap((style) => {
    const qualities = sourceData.styleQualities[style] || [];
    return [
      `<p class="recommendation"><strong>${style} detail:</strong> ${styleSummary(style, payload.scores[style])}</p>`,
      ...qualities.slice(0, 4).map((quality) => `<p class="recommendation">${quality}</p>`)
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
  state.asked = [];
  state.answers = [];
  state.pendingQueue = [];
  state.complete = false;
  resultsView.classList.add("hidden");
  assessmentView.classList.remove("hidden");
  seed = hashSeed();
  buildBaselineQueue();
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
    nextButton.disabled = false;
  });
});

nextButton.addEventListener("click", () => {
  if (state.selectedValue === null) return;
  answerCurrent(state.selectedValue);
});
backButton.addEventListener("click", () => {});
restartButton.addEventListener("click", restartAssessment);
copyButton.addEventListener("click", copySummary);

restartAssessment();
