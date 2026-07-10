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
      originalText: question.text,
      displayedText: firstPersonQuestion(question.text),
      direction: question.direction
    }))
  })
`, context));

const lines = [
  "# Original Leadership Assessment Question Set",
  "",
  "This file lists the original source questions currently active in the application. No corrected, derived, reverse-framed, or contrast questions are included.",
  "",
  "The application displays questions in first person. When the displayed wording differs from the source wording, both versions are shown.",
  "",
  `**Total original questions:** ${inventory.questions.length}`,
  ""
];

for (const style of inventory.styles) {
  const questions = inventory.questions.filter((question) => question.style === style);

  lines.push(`## ${style}`, "");
  lines.push(`Original items: ${questions.length}.`, "");

  questions.forEach((question, index) => {
    lines.push(`### ${index + 1}. ${question.id}`, "");
    lines.push(`**Displayed wording:** ${question.displayedText}`, "");
    if (question.originalText !== question.displayedText) {
      lines.push(`**Original source wording:** ${question.originalText}`, "");
    }
    lines.push(`- Scoring direction: ${question.direction}`);
    lines.push("");
  });
}

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${inventory.questions.length} active questions to ${outputPath}`);
