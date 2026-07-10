const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const respondentsPath = path.join(__dirname, "respondents.json");
const respondents = JSON.parse(fs.readFileSync(respondentsPath, "utf8"));
const ANSWERS_PER_STYLE = 5;
const ANSWER_WEIGHTS = {
  1: -3,
  2: -1,
  3: 0,
  4: 1,
  5: 3
};

function mockElement() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    dataset: {},
    validity: { valid: true },
    value: "",
    disabled: false,
    textContent: "",
    innerHTML: "",
    addEventListener() {},
    setAttribute() {},
    focus() {}
  };
}

function createContext() {
  const ratingOptions = [1, 2, 3, 4, 5].map((value) => ({
    ...mockElement(),
    dataset: { value: String(value) }
  }));

  const crypto = {
    randomUUID: () => "benchmark-attempt-id",
    getRandomValues: (array) => {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = index + 1;
      }
      return array;
    }
  };

  const context = {
    console,
    crypto,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    localStorage: { getItem: () => "[]", setItem() {} },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    document: {
      querySelector: () => mockElement(),
      querySelectorAll: (selector) => (selector === ".rating-option" ? ratingOptions : [])
    },
    window: {
      crypto,
      location: { hash: "" },
      setTimeout() {}
    }
  };

  vm.createContext(context);
  return context;
}

function loadApp() {
  const context = createContext();
  const dataCode = fs.readFileSync(path.join(repoRoot, "data", "leadership-assessment.js"), "utf8");
  const appCode = fs.readFileSync(path.join(repoRoot, "app.js"), "utf8");
  vm.runInContext(`${dataCode}\n${appCode}`, context);
  return context;
}

function buildAnswers(respondent, styles) {
  return styles.flatMap((style) => {
    const values = respondent.answersByStyle[style];
    if (!Array.isArray(values) || !values.length) {
      throw new Error(`${respondent.id} is missing answers for ${style}.`);
    }

    const expandedValues = Array.from({ length: ANSWERS_PER_STYLE }, (_, index) => values[index % values.length]);

    return expandedValues.map((value, index) => ({
      questionId: `${respondent.id}_${style.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${index + 1}`,
      text: `Benchmark item for ${style}`,
      style,
      value,
      score: ANSWER_WEIGHTS[value] ?? 0,
      direction: "positive",
      derived: false,
      derivedFrom: null
    }));
  });
}

function evaluateExpected(expected, payload) {
  const failures = [];
  const actualStyles = [...payload.primaryStyles].sort();

  if (typeof expected.interpretable === "boolean"
    && payload.quality.isInterpretable !== expected.interpretable) {
    failures.push(`expected interpretable=${expected.interpretable}, got ${payload.quality.isInterpretable}`);
  }

  if (Array.isArray(expected.primaryStyles)) {
    const expectedStyles = [...expected.primaryStyles].sort();
    if (JSON.stringify(actualStyles) !== JSON.stringify(expectedStyles)) {
      failures.push(`expected styles ${expectedStyles.join(" + ") || "(none)"}, got ${actualStyles.join(" + ") || "(none)"}`);
    }
  }

  if (typeof expected.primaryStyleCount === "number"
    && payload.primaryStyles.length !== expected.primaryStyleCount) {
    failures.push(`expected ${expected.primaryStyleCount} primary style(s), got ${payload.primaryStyles.length}`);
  }

  return failures;
}

function runCase(respondent) {
  const context = loadApp();
  const styles = vm.runInContext("styles", context);
  const answers = buildAnswers(respondent, styles);

  context.__benchmark = {
    respondent: {
      name: respondent.name,
      email: `${respondent.id}@benchmark.local`
    },
    answers,
    questionHistory: answers.map((answer) => ({
    id: answer.questionId,
    text: answer.text,
    style: answer.style,
    direction: answer.direction,
    derived: answer.derived,
    derivedFrom: answer.derivedFrom
    }))
  };
  vm.runInContext(`
    state.respondent = __benchmark.respondent;
    state.answers = __benchmark.answers;
    state.questionHistory = __benchmark.questionHistory;
    state.currentIndex = __benchmark.answers.length - 1;
  `, context);

  const payload = vm.runInContext("resultPayload()", context);
  const failures = evaluateExpected(respondent.expected || {}, payload);

  return {
    id: respondent.id,
    name: respondent.name,
    description: respondent.description,
    passed: failures.length === 0,
    failures,
    primaryStyles: payload.primaryStyles,
    isInterpretable: payload.quality.isInterpretable,
    questionsAsked: payload.questionsAsked,
    scores: payload.scores,
    flags: payload.quality.classificationFlags || []
  };
}

function printResult(result) {
  const status = result.passed ? "PASS" : "FAIL";
  const styles = result.primaryStyles.length ? result.primaryStyles.join(" + ") : "No Leadership Style Assigned";
  console.log(`${status} ${result.id}`);
  console.log(`  Result: ${styles}`);
  console.log(`  Interpretable: ${result.isInterpretable}`);
  console.log(`  Questions: ${result.questionsAsked}`);
  console.log(`  Scores: ${Object.entries(result.scores).sort((a, b) => b[1] - a[1]).map(([style, score]) => `${style} ${score}`).join(", ")}`);
  if (result.flags.length) console.log(`  Flags: ${result.flags.join(" | ")}`);
  if (result.failures.length) console.log(`  Problems: ${result.failures.join(" | ")}`);
}

const results = respondents.map(runCase);
results.forEach(printResult);

const failed = results.filter((result) => !result.passed);
console.log("");
console.log(`Benchmark: ${results.length - failed.length}/${results.length} passed`);

if (failed.length) {
  process.exitCode = 1;
}
