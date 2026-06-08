const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "QUESTION_BANK_REVIEW.md");

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

const ratingOptions = [1, 2, 3, 4, 5].map((value) => ({
  ...mockElement(),
  dataset: { value: String(value) }
}));

const crypto = {
  randomUUID: () => "question-export",
  getRandomValues: (array) => {
    for (let index = 0; index < array.length; index += 1) array[index] = index + 1;
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
const dataCode = fs.readFileSync(path.join(repoRoot, "data", "leadership-assessment.js"), "utf8");
const appCode = fs.readFileSync(path.join(repoRoot, "app.js"), "utf8");
vm.runInContext(`${dataCode}\n${appCode}`, context);

const inventory = JSON.parse(vm.runInContext(`
  JSON.stringify({
    styles,
    questions: questionBank.map((question) => ({
      id: question.id,
      style: question.style,
      text: firstPersonQuestion(question.text),
      direction: question.direction,
      derived: Boolean(question.derived),
      derivedFrom: question.derivedFrom || null,
      baselineEligible: !question.derived || String(question.id).startsWith("corrected_autocratic_")
    }))
  })
`, context));

function questionType(question) {
  if (String(question.id).startsWith("corrected_autocratic_")) return "Corrected Autocratic";
  if (question.derived) return "Derived";
  return "Original source";
}

const lines = [
  "# Active Leadership Assessment Question Bank",
  "",
  "This file lists every question currently available to the application. It is generated from the active `questionBank` in `app.js`, not from inactive or excluded source rows.",
  "",
  "## Reading The Labels",
  "",
  "- **Original source:** Loaded from the active source question data.",
  "- **Corrected Autocratic:** Replacement item based on the approved Autocratic materials. The original spreadsheet block labeled Autocratic is excluded because its content did not measure Autocratic leadership.",
  "- **Derived:** A reverse-framed or contrast item created from an approved source construct.",
  "- **Baseline eligible:** The item may be selected for the current five-per-style production baseline.",
  "- **Adaptive only:** The item is available to adaptive selection logic but is excluded from the current baseline.",
  "",
  `**Total active questions:** ${inventory.questions.length}`,
  ""
];

for (const style of inventory.styles) {
  const questions = inventory.questions.filter((question) => question.style === style);
  const baselineCount = questions.filter((question) => question.baselineEligible).length;

  lines.push(`## ${style}`, "");
  lines.push(`Active items: ${questions.length}. Baseline eligible: ${baselineCount}.`, "");

  questions.forEach((question, index) => {
    lines.push(`### ${index + 1}. ${question.id}`, "");
    lines.push(question.text, "");
    lines.push(`- Type: ${questionType(question)}`);
    lines.push(`- Scoring direction: ${question.direction}`);
    lines.push(`- Selection status: ${question.baselineEligible ? "Baseline eligible" : "Adaptive only"}`);
    if (question.derivedFrom) lines.push(`- Provenance: ${question.derivedFrom}`);
    lines.push("");
  });
}

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${inventory.questions.length} active questions to ${outputPath}`);
