const MAX_QUESTIONS = 40;
const BASELINE_PER_STYLE = 5;
const MIN_STYLE_SCORE = -15;
const MAX_STYLE_SCORE = 15;
const ANSWER_WEIGHTS = {
  1: -3,
  2: -1,
  3: 0,
  4: 1,
  5: 3
};

const sourceData = window.LEADERSHIP_DATA;
const styles = sourceData.styles;

const finalOutputProfiles = {
  "Autocratic": {
    overview: "Autocratic leaders value structure, decisiveness, accountability, and clear expectations. They perform especially well in high-risk, time-sensitive, or crisis environments.",
    strengths: [
      "Makes decisions quickly.",
      "Provides clear direction.",
      "Maintains standards and accountability.",
      "Effective in emergencies or high-pressure situations.",
      "Creates operational clarity."
    ],
    challenges: [
      "Can unintentionally discourage collaboration.",
      "Team members may feel unheard.",
      "Innovation may decrease if control becomes excessive.",
      "Risk of over-supervision.",
      "Morale may decline if autonomy is limited."
    ],
    coaching: "Your decisiveness is valuable, especially in environments where precision matters. The next stage of leadership growth is learning when to direct and when to empower.",
    teamNeeds: [
      "Creative employees often need flexibility and ownership.",
      "Experienced professionals may resist excessive oversight.",
      "Younger or developing employees may initially appreciate structure but later desire autonomy."
    ],
    development: [
      "Delegate decision-making intentionally.",
      "Invite input before final decisions when appropriate.",
      "Differentiate between urgency and preference.",
      "Focus on developing leaders, not just followers."
    ]
  },
  "Charismatic": {
    overview: "Charismatic leaders inspire others through confidence, energy, communication, and personal influence. People naturally gravitate toward them because they create emotional engagement and excitement around goals.",
    strengths: [
      "Inspires enthusiasm and momentum.",
      "Strong communicator and motivator.",
      "Builds emotional connection quickly.",
      "Effective during change or uncertainty.",
      "Encourages belief in vision and possibility."
    ],
    challenges: [
      "Can unintentionally dominate conversations.",
      "May rely too heavily on personality over systems.",
      "Risk of emotional decision-making.",
      "Team members may become dependent on leader presence.",
      "Can overlook quieter contributors."
    ],
    coaching: "Your influence is one of your greatest assets. However, long-term leadership effectiveness requires balancing inspiration with structure, consistency, and accountability. Focus on building systems that succeed even when you are not in the room.",
    teamNeeds: [
      "High-performing independent employees may desire more autonomy than inspiration.",
      "Analytical team members may want data and clarity rather than emotional motivation.",
      "Introverted employees may need intentional space to contribute ideas."
    ],
    development: [
      "Practice active listening before influencing.",
      "Create leadership depth within the team.",
      "Balance inspiration with measurable execution.",
      "Encourage dissenting opinions and diverse perspectives."
    ]
  },
  "Democratic": {
    overview: "Democratic leaders emphasize collaboration, participation, and shared decision-making. They value team input and collective ownership.",
    strengths: [
      "Encourages engagement and buy-in.",
      "Builds collaboration and trust.",
      "Promotes diverse perspectives.",
      "Improves morale and inclusion.",
      "Encourages creativity and innovation."
    ],
    challenges: [
      "Decision-making can become slow.",
      "Consensus may be prioritized over clarity.",
      "Risk of unclear authority.",
      "Difficult decisions may be delayed.",
      "Stronger personalities may dominate discussions."
    ],
    coaching: "Your collaborative style helps people feel valued and included. Continued leadership growth requires balancing participation with decisiveness.",
    teamNeeds: [
      "Some employees prefer direct instruction.",
      "Crisis situations often require faster decision-making.",
      "Independent workers may not desire extensive collaboration."
    ],
    development: [
      "Set clear decision timelines.",
      "Know when collaboration is necessary versus optional.",
      "Maintain authority while encouraging participation.",
      "Ensure all voices are heard equally."
    ]
  },
  "Laissez-Faire": {
    overview: "Laissez-faire leaders prioritize autonomy, independence, and trust. They often empower highly capable teams by avoiding unnecessary interference.",
    strengths: [
      "Encourages independence and creativity.",
      "Builds trust and ownership.",
      "Works well with highly skilled professionals.",
      "Promotes self-direction.",
      "Avoids micromanagement."
    ],
    challenges: [
      "Team members may feel unsupported.",
      "Accountability may become inconsistent.",
      "Communication gaps may emerge.",
      "Underperformers may drift without guidance.",
      "Conflict may go unaddressed."
    ],
    coaching: "Your trust in others is valuable. However, leadership still requires visible engagement, accountability, and consistent communication.",
    teamNeeds: [
      "New employees usually need more structure and feedback.",
      "Some team members require reassurance and direction.",
      "High achievers thrive under autonomy, but struggling employees may not."
    ],
    development: [
      "Increase intentional check-ins.",
      "Clarify expectations and accountability.",
      "Address issues earlier.",
      "Balance freedom with support."
    ]
  },
  "Servant": {
    overview: "Servant leaders prioritize the growth, well-being, and success of others. They lead through humility, empathy, support, and service.",
    strengths: [
      "Builds trust and loyalty.",
      "Develops strong team culture.",
      "Demonstrates empathy and emotional intelligence.",
      "Encourages collaboration.",
      "Invests deeply in people development."
    ],
    challenges: [
      "May avoid difficult conversations.",
      "Risk of overextending emotionally.",
      "Can prioritize harmony over accountability.",
      "Decision-making may become delayed.",
      "Personal boundaries may weaken."
    ],
    coaching: "Your people-centered leadership creates strong relationships and healthy culture. Continued growth requires balancing compassion with accountability and decisiveness.",
    teamNeeds: [
      "High-accountability employees still need direct performance feedback.",
      "Strong personalities may exploit overly accommodating leadership.",
      "Some team members prefer clear direction over relational leadership."
    ],
    development: [
      "Strengthen difficult conversation skills.",
      "Set clearer boundaries.",
      "Maintain accountability consistently.",
      "Remember that serving others sometimes requires correction."
    ]
  },
  "Situational": {
    overview: "Situational leaders adapt their leadership approach based on the needs, maturity, and readiness of the team or situation.",
    strengths: [
      "Highly adaptable.",
      "Flexible communicator.",
      "Adjusts leadership to team needs.",
      "Effective across diverse personalities.",
      "Balances support and direction well."
    ],
    challenges: [
      "Inconsistency may confuse teams.",
      "Employees may struggle predicting expectations.",
      "Can appear indecisive if over-adjusting.",
      "Leadership identity may feel unclear."
    ],
    coaching: "Your adaptability is one of the most advanced leadership traits. The next step is ensuring consistency in values and communication while maintaining flexibility in approach.",
    teamNeeds: [
      "New employees often need more structure.",
      "Experienced employees may prefer autonomy.",
      "Some employees need emotional encouragement while others prefer efficiency."
    ],
    development: [
      "Clarify consistent leadership expectations.",
      "Avoid changing approaches too frequently.",
      "Communicate the why behind adjustments.",
      "Balance flexibility with stability."
    ]
  },
  "Transactional": {
    overview: "Transactional leaders focus on structure, accountability, goals, rewards, and performance management. They excel at maintaining consistency and measurable outcomes.",
    strengths: [
      "Creates clarity and order.",
      "Strong accountability systems.",
      "Effective performance management.",
      "Clearly communicates expectations.",
      "Maintains operational consistency."
    ],
    challenges: [
      "May feel overly process-driven.",
      "Innovation may become limited.",
      "Relationships can feel secondary to performance.",
      "Employees may feel motivated only by rewards or consequences.",
      "Can struggle with emotional engagement."
    ],
    coaching: "Your ability to create structure and accountability drives results. Long-term influence grows when performance management is balanced with inspiration, development, and relationship-building.",
    teamNeeds: [
      "Creative employees may desire flexibility.",
      "Relationship-oriented employees need emotional connection.",
      "Highly autonomous employees may resist rigid systems."
    ],
    development: [
      "Increase recognition beyond measurable outcomes.",
      "Focus on intrinsic motivation.",
      "Build stronger relational engagement.",
      "Encourage innovation alongside accountability."
    ]
  },
  "Transformational": {
    overview: "Transformational leaders focus on vision, growth, inspiration, and helping others exceed expectations. They often create highly motivated and purpose-driven teams.",
    strengths: [
      "Inspires growth and innovation.",
      "Creates strong organizational vision.",
      "Encourages creativity and development.",
      "Motivates people toward meaningful goals.",
      "Builds strong commitment to mission."
    ],
    challenges: [
      "May overlook operational details.",
      "Can unintentionally exhaust teams with constant change.",
      "Vision may outpace execution.",
      "Risk of insufficient follow-through.",
      "Team members may struggle with unclear priorities."
    ],
    coaching: "Your ability to elevate people is a major strength. Continued success depends on balancing visionary thinking with operational discipline and sustainable pacing.",
    teamNeeds: [
      "Detail-oriented employees may need clearer execution plans.",
      "Stability-focused team members may feel overwhelmed by constant change.",
      "Some employees need practical direction before inspiration."
    ],
    development: [
      "Strengthen systems and accountability structures.",
      "Celebrate progress, not just future vision.",
      "Slow down enough to reinforce clarity.",
      "Ensure goals are measurable and actionable."
    ]
  }
};

const questionBank = sourceData.questions;
const state = {
  currentQuestion: null,
  selectedValue: null,
  started: false,
  respondent: {
    name: "",
    email: ""
  },
  currentIndex: 0,
  questionHistory: [],
  answers: [],
  pendingQueue: [],
  complete: false
};

const identityView = document.querySelector("#identityView");
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
const identityForm = document.querySelector("#identityForm");
const respondentNameInput = document.querySelector("#respondentName");
const respondentEmailInput = document.querySelector("#respondentEmail");
const identityError = document.querySelector("#identityError");

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
  const weightedScore = ANSWER_WEIGHTS[value] ?? 0;
  if (question.direction === "negative") {
    return -weightedScore;
  }
  return weightedScore;
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
    const percentage = Math.round(((total - MIN_STYLE_SCORE) / (MAX_STYLE_SCORE - MIN_STYLE_SCORE)) * 100);
    scores[style] = total;
    raw[style] = {
      count: answers.length,
      total,
      average,
      percentage: Math.max(0, Math.min(100, percentage)),
      values: answers.map((answer) => answer.score)
    };
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
  const neutralRatio = values.length ? (counts[3] || 0) / values.length : 0;
  const extremeRatio = values.length ? ((counts[1] || 0) + (counts[5] || 0)) / values.length : 0;

  const flags = [];
  let invalid = false;
  if (completeAnswers.length >= 12 && straightLineRatio >= 0.85) {
    flags.push("Most responses used the same answer option.");
    invalid = true;
  }
  if (completeAnswers.length >= 12 && variance < 0.45) {
    flags.push("Responses showed very low variation.");
    invalid = true;
  }
  if (completeAnswers.length >= 12 && neutralRatio >= 0.85) {
    flags.push("Most responses were neutral.");
    invalid = true;
  }
  if (completeAnswers.length >= 12 && extremeRatio >= 0.9 && variance < 0.65) {
    flags.push("Responses relied almost entirely on one extreme answer pattern.");
    invalid = true;
  }
  return {
    flags,
    invalid,
    straightLineRatio,
    variance,
    derivedRatio: 0,
    neutralRatio,
    extremeRatio
  };
}

function classificationDecision(scoresData, quality) {
  const [first, second] = scoresData.ranked;
  const flags = [...quality.flags];

  if (quality.invalid) {
    return { primaryStyles: [], isInterpretable: false, flags };
  }

  if (second && first[1] === second[1]) {
    return { primaryStyles: [first[0], second[0]], isInterpretable: true, flags };
  }

  return { primaryStyles: [first[0]], isInterpretable: true, flags };
}

function buildBaselineQueue() {
  const perStyle = styles.flatMap((style) => {
    const sourceItems = questionBank.filter((question) => question.style === style);
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
    const previousStyle = result[result.length - 1]?.style;
    const candidates = shuffle(styles)
      .filter((style) => buckets[style].length)
      .sort((a, b) => buckets[b].length - buckets[a].length);
    const nextStyle = candidates.find((style) => style !== previousStyle) || candidates[0];
    result.push(buckets[nextStyle].shift());
  }

  return result;
}

function shouldStop() {
  return answeredCount() >= MAX_QUESTIONS;
}

function advanceQuestion() {
  if (shouldStop()) {
    renderResults();
    return;
  }

  const next = state.pendingQueue.shift();

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
  progressText.textContent = `Question ${state.currentIndex + 1} of ${MAX_QUESTIONS}`;
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
  if (score >= 8) return "high";
  if (score >= 2) return "moderate";
  return "low";
}

function strengthLabel(score) {
  if (score <= -8) return "Low correlation";
  if (score <= -2) return "Low tendency";
  if (score <= 4) return "Moderate tendency";
  if (score <= 10) return "High tendency";
  return "Strong tendency";
}

function styleSummary(style, score) {
  return sourceData.scoreDescriptions[style]?.[tendencyFor(score)] || "";
}

function radarRatio(score) {
  return Math.max(0, Math.min(1, (score - MIN_STYLE_SCORE) / (MAX_STYLE_SCORE - MIN_STYLE_SCORE)));
}

function profileConcentration(scores) {
  const vector = styles.reduce((memo, style, index) => {
    const ratio = radarRatio(scores[style]);
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / styles.length);
    memo.x += Math.cos(angle) * ratio;
    memo.y += Math.sin(angle) * ratio;
    memo.weight += ratio;
    return memo;
  }, { x: 0, y: 0, weight: 0 });
  const pull = vector.weight ? Math.min(1, Math.hypot(vector.x, vector.y) / vector.weight) : 0;

  if (pull < 0.18) {
    return { pull, shortLabel: "Balanced", longLabel: "Balanced across styles" };
  }
  if (pull < 0.38) {
    return { pull, shortLabel: "Mixed", longLabel: "Moderately differentiated" };
  }
  return { pull, shortLabel: "Focused", longLabel: "Concentrated tendency" };
}

function polarPoint(center, radius, index, total) {
  const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / total);
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
    angle
  };
}

function renderLeadershipMap(payload, ranked, hasClassification) {
  const center = 180;
  const maxRadius = 112;
  const total = styles.length;
  const stylePoints = styles.map((style, index) => {
    const ratio = radarRatio(payload.scores[style]);
    const point = polarPoint(center, maxRadius * ratio, index, total);
    const labelPoint = polarPoint(center, maxRadius + 34, index, total);
    const axisPoint = polarPoint(center, maxRadius, index, total);
    return { style, ratio, point, labelPoint, axisPoint };
  });
  const polygonPoints = stylePoints.map(({ point }) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const concentration = profileConcentration(payload.scores);
  const vector = stylePoints.reduce((memo, item) => {
    memo.x += Math.cos(item.axisPoint.angle) * item.ratio;
    memo.y += Math.sin(item.axisPoint.angle) * item.ratio;
    return memo;
  }, { x: 0, y: 0 });
  const pull = concentration.pull;
  const landingAngle = Math.atan2(vector.y, vector.x);
  const landingRadius = maxRadius * pull;
  const landing = {
    x: center + Math.cos(landingAngle) * landingRadius,
    y: center + Math.sin(landingAngle) * landingRadius
  };

  return `
    <section class="leadership-map" aria-label="Leadership style map">
      <div class="map-copy">
        <h3>Leadership Style Map</h3>
        <p>The marker shows where your overall pattern lands. Near the center means your answers are spread across styles; closer to an edge means one direction is pulling more strongly.</p>
        <strong>${hasClassification ? concentration.longLabel : "Review response pattern"}</strong>
      </div>
      <svg class="radar-map" viewBox="0 0 360 360" role="img" aria-label="Dartboard style leadership map">
        <circle class="radar-ring" cx="${center}" cy="${center}" r="28"></circle>
        <circle class="radar-ring" cx="${center}" cy="${center}" r="56"></circle>
        <circle class="radar-ring" cx="${center}" cy="${center}" r="84"></circle>
        <circle class="radar-ring outer" cx="${center}" cy="${center}" r="${maxRadius}"></circle>
        ${stylePoints.map(({ style, labelPoint, axisPoint }) => `
          <line class="radar-axis" x1="${center}" y1="${center}" x2="${axisPoint.x.toFixed(1)}" y2="${axisPoint.y.toFixed(1)}"></line>
          <text class="radar-label" x="${labelPoint.x.toFixed(1)}" y="${labelPoint.y.toFixed(1)}" text-anchor="middle">${style}</text>
        `).join("")}
        <polygon class="radar-shape ${hasClassification ? "" : "muted"}" points="${polygonPoints}"></polygon>
        ${stylePoints.map(({ point }) => `
          <circle class="radar-style-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4"></circle>
        `).join("")}
        <circle class="radar-center" cx="${center}" cy="${center}" r="4"></circle>
        <circle class="radar-landing" cx="${landing.x.toFixed(1)}" cy="${landing.y.toFixed(1)}" r="${hasClassification ? 9 : 7}"></circle>
      </svg>
      <div class="map-legend" aria-label="Leadership tendency labels">
        ${ranked.map(([style, score]) => `
          <article class="${payload.primaryStyles.includes(style) ? "primary-style" : ""} ${hasClassification ? "" : "muted-score"}">
            <span>${style}</span>
            <strong>${strengthLabel(score)}</strong>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function resultPayload() {
  const scoresData = calculateScores();
  const quality = responseQuality();
  const decision = classificationDecision(scoresData, quality);
  const resultSummary = !decision.isInterpretable
    ? "Your response pattern does not provide enough evidence to assign a leadership style. This can happen when answers are too evenly distributed, too inconsistent, or do not provide enough differentiation between styles."
    : decision.primaryStyles.length === 2
    ? `Your strongest tendencies are ${decision.primaryStyles[0]} and ${decision.primaryStyles[1]}. The leadership map below shows how your answers are distributed across styles.`
    : `Your strongest tendency is ${decision.primaryStyles[0]}. The leadership map below shows how your answers are distributed across styles.`;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    respondent: {
      name: state.respondent.name,
      email: state.respondent.email
    },
    respondentLabel: state.respondent.name,
    primaryStyles: decision.primaryStyles,
    scores: scoresData.scores,
    scoreLabels: Object.fromEntries(Object.entries(scoresData.scores).map(([style, score]) => [style, strengthLabel(score)])),
    confidence: quality.invalid ? "Invalid response pattern" : "Arithmetic scoring",
    quality: {
      ...quality,
      classificationFlags: decision.flags,
      isInterpretable: decision.isInterpretable
    },
    resultSummary,
    answers: state.answers.filter(Boolean),
    questionsAsked: answeredCount()
  };
}

function persistAttemptLocally(payload) {
  const existing = JSON.parse(localStorage.getItem("leadershipAssessmentAttempts") || "[]");
  existing.push(payload);
  localStorage.setItem("leadershipAssessmentAttempts", JSON.stringify(existing));
}

async function persistAttemptToDatabase(payload) {
  const response = await fetch("/api/attempts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Database save failed.");
  }

  return data;
}

function persistAttempt(payload) {
  persistAttemptLocally(payload);

  persistAttemptToDatabase(payload)
    .catch((error) => {
      console.warn("Assessment database save did not complete.", error);
    });
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
  identityView.classList.add("hidden");
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
      .map(([style, score]) => `<span>${style}: <strong>${strengthLabel(score)}</strong></span>`)
      .join("");
    const answerRows = attempt.answers
      .map((answer, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${answer.text}</td>
          <td>${answerLabel(answer.value)}</td>
          <td>${answer.derived ? "Derived" : "Source"}</td>
        </tr>
      `)
      .join("");

    return `
      <article class="attempt-card">
        <header>
          <div>
            <h3>${attempt.primaryStyles.length ? `${attempt.primaryStyles.join(" + ")} Leadership` : "No Leadership Style Assigned"}</h3>
            <p>${attempt.respondent?.name || attempt.respondentLabel || "Unknown respondent"}${attempt.respondent?.email ? ` · ${attempt.respondent.email}` : ""}</p>
            <p>${created} · ${attempt.questionsAsked} questions</p>
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

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderProfileCard(style) {
  const profile = finalOutputProfiles[style];
  if (!profile) {
    return `
      <article class="detail-card">
        <h4>${style} Leadership</h4>
        <p>${styleSummary(style, 100)}</p>
      </article>
    `;
  }

  return `
    <article class="detail-card profile-section">
      <h4>${style} Leadership</h4>
      <div>
        <h5>Overview</h5>
        <p>${profile.overview}</p>
      </div>
      <div>
        <h5>Strengths</h5>
        ${renderList(profile.strengths)}
      </div>
      <div>
        <h5>Potential Challenges</h5>
        ${renderList(profile.challenges)}
      </div>
      <div>
        <h5>Coaching Guidance</h5>
        <p>${profile.coaching}</p>
      </div>
      <div>
        <h5>Working With Different Team Needs</h5>
        ${renderList(profile.teamNeeds)}
      </div>
      <div>
        <h5>Development Focus</h5>
        ${renderList(profile.development)}
      </div>
    </article>
  `;
}

function renderLowestStyleNote(style, score) {
  return `
    <article class="detail-card">
      <h4>Lowest Scoring Style: ${style}</h4>
      <p>${styleSummary(style, score)}</p>
    </article>
  `;
}

function renderNoClassificationResult() {
  return `
    <article class="detail-card warning-card">
      <h4>No Leadership Style Assigned</h4>
      <p>Your response pattern does not provide enough evidence to assign a leadership style. Please retake the assessment and use the full response range honestly where it applies.</p>
    </article>
  `;
}

function renderResults() {
  state.complete = true;
  const payload = resultPayload();
  persistAttempt(payload);

  const ranked = Object.entries(payload.scores).sort((a, b) => b[1] - a[1]);
  const primaryLabel = payload.primaryStyles.join(" + ");
  const concentration = profileConcentration(payload.scores);

  identityView.classList.add("hidden");
  startView.classList.add("hidden");
  assessmentView.classList.add("hidden");
  attemptsView.classList.add("hidden");
  resultsView.classList.remove("hidden");
  progressText.textContent = `Complete after ${payload.questionsAsked} questions`;
  progressPercent.textContent = "100%";
  progressBar.style.width = "100%";
  const hasClassification = payload.primaryStyles.length > 0 && payload.quality.isInterpretable;
  profileTitle.textContent = hasClassification ? `Strongest tendency: ${primaryLabel}` : "No Leadership Style Assigned";
  profileSummary.textContent = payload.resultSummary;
  overallScore.textContent = hasClassification ? concentration.shortLabel : "Review";

  dimensionScores.innerHTML = renderLeadershipMap(payload, ranked, hasClassification);

  const lowest = ranked[ranked.length - 1];
  recommendations.innerHTML = !hasClassification
    ? renderNoClassificationResult()
    : [
      ...payload.primaryStyles.map((style) => renderProfileCard(style)),
      renderLowestStyleNote(lowest[0], lowest[1]),
      `<article class="detail-card">
        <h4>Final Summary</h4>
        <p>No leadership style is inherently better than another. Effective leadership depends on context, emotional intelligence, adaptability, and the ability to meet the needs of the people being led. Your dominant style represents your natural tendencies, not your limitations. The strongest leaders learn when to lean into their strengths and when to adapt for the benefit of the team.</p>
      </article>`
    ].join("");
  window.lastAssessmentResult = payload;
}

function restartAssessment() {
  state.currentQuestion = null;
  state.selectedValue = null;
  state.started = false;
  state.respondent = { name: "", email: "" };
  state.currentIndex = 0;
  state.questionHistory = [];
  state.answers = [];
  state.pendingQueue = [];
  state.complete = false;
  identityView.classList.remove("hidden");
  startView.classList.add("hidden");
  resultsView.classList.add("hidden");
  assessmentView.classList.add("hidden");
  attemptsView.classList.add("hidden");
  respondentNameInput.value = "";
  respondentEmailInput.value = "";
  identityError.textContent = "";
  seed = hashSeed();
  buildBaselineQueue();
  progressText.textContent = "Ready to begin";
  progressPercent.textContent = "0%";
  progressBar.style.width = "4%";
}

function continueToInstructions(event) {
  event.preventDefault();
  const name = respondentNameInput.value.trim();
  const email = respondentEmailInput.value.trim();

  if (!name) {
    identityError.textContent = "Name is required to begin.";
    respondentNameInput.focus();
    return;
  }
  if (!email) {
    identityError.textContent = "Email is required to begin.";
    respondentEmailInput.focus();
    return;
  }
  if (!respondentEmailInput.validity.valid) {
    identityError.textContent = "Enter a valid email address to begin.";
    respondentEmailInput.focus();
    return;
  }

  state.respondent = { name, email };
  identityError.textContent = "";
  identityView.classList.add("hidden");
  startView.classList.remove("hidden");
  progressText.textContent = "Instructions";
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
    .map(([style, score]) => `${style}: ${strengthLabel(score)}`)
    .join("\n");

  const title = payload.primaryStyles.length
    ? `${payload.primaryStyles.join(" + ")} Leadership`
    : "No Leadership Style Assigned";
  const summary = `${title}\nQuestions asked: ${payload.questionsAsked}\n\n${scoreLines}`;

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
    identityView.classList.remove("hidden");
  }
});
identityForm.addEventListener("submit", continueToInstructions);

restartAssessment();

if (window.location.hash === "#review") {
  renderAttemptsView();
}
