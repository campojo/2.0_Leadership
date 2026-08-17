# Leadership Assessment Design Choices

## Source of Truth

The assessment is based primarily on the provided dissertation-derived leadership materials in `source-files/`.

Current source files used:

- `Questions 2.0 (5).xlsx`
- `H-M-L Scores v2.docx.pdf`
- `Syles detailed (1).xlsx - Sheet1.csv`
- `Style helps (1).xlsx - Sheet1.csv`
- `Instructions for Taking the Leadership Assessment.docx.pdf`

The active question bank includes eight leadership styles:

- Autocratic
- Democratic
- Laissez-Faire
- Transactional
- Transformational
- Servant
- Charismatic
- Situational

## Question Count

The app asks exactly 40 scored assessment questions.

The current design uses the full 40-question allowance so each leadership style receives equal coverage and the result is not overly dependent on a small number of broadly agreeable items.

## Randomization

Questions must be randomized so respondents do not receive all questions from one leadership style in a block.

The baseline phase includes coverage across every leadership style. Baseline items are randomized and interleaved so the respondent does not receive all questions from one style together.

During the assessment, the app must not display the leadership style/category associated with the current question. This reduces obvious response gaming, especially for styles respondents may perceive as desirable or undesirable.

## Instructions

The assessment opens with a respondent information screen before the instruction screen.

The respondent information screen requires both name and email so results can be tied to the participant and emailed after completion.

After respondent information is collected, the assessment shows an instruction screen based on `Instructions for Taking the Leadership Assessment.docx.pdf`.

The start screen explains that the assessment is a self-assessment, asks respondents to answer honestly, discourages overthinking, and clarifies that there is no perfect leadership style.

## Question Wording

The assessment is a self-assessment, so displayed questions should be phrased in first person wherever possible.

If source content uses third-person language such as `The leader...`, the app converts the displayed question to first person while preserving the original construct.

## Active Source Set

The active assessment uses the original imported question set without corrected, derived, reverse-framed, or contrast additions.

The original Autocratic block is active pending manual review and revision by the assessment owner.

## Minimum Coverage

At least five scored questions from every leadership style must be answered before a result can be produced.

The required baseline is five questions per style, randomized and interleaved, for 40 total questions.

All assessment questions come from the original source question pool.

## Administration Model

The current production assessment is not adaptive. It asks the full 40-question baseline every time.

The app randomly selects five questions from each of the eight leadership styles, then interleaves those questions so styles are not asked in blocks.

The assessment must not stop early. Any future adaptive or shortened version should be treated as a separate redesign and benchmarked before release.

## Review Navigation

Respondents may go back to review previous questions.

Rules:

- Respondents cannot skip an unanswered question.
- Going backward must preserve prior answers.
- If a respondent selects a different answer on a previous question, that answer is updated.
- Already asked questions remain in the sequence so review does not unexpectedly erase answers.

## Derived Questions

Derived, reverse-framed, and contrast questions are not active. Any future additions require explicit review and approval before entering the assessment question bank.

## Scoring

Responses use a five-point Likert scale with weighted arithmetic scoring:

- Strongly Disagree: `-3`
- Disagree: `-1`
- Neutral: `0`
- Agree: `1`
- Strongly Agree: `3`

Each style receives five answered questions. The style strength is the sum of the five weighted answer scores for that style.

Because every style receives the same number of questions, scores are not normalized. Each style can range from `-15` to `15`.

Items score according to the direction stored in the original source data. A negative-direction item reverses the weighted value.

Respondents should not see raw numerical totals. The user-facing output should use strength labels and a graphical leadership map.

Current strength labels:

- `-15` through `-8`: Low correlation
- `-7` through `-2`: Low tendency
- `-1` through `4`: Moderate tendency
- `5` through `10`: High tendency
- `11` through `15`: Strong tendency

## Classification and Response Quality

The strongest style is the style with the highest weighted sum.

If exactly two styles tie for the highest weighted sum, the result may show both styles. The result should never show more than two primary styles.

The app may withhold classification only when the response pattern itself is not interpretable.

Response-quality signals include:

- Straight-lining behavior, such as selecting the same answer repeatedly.
- Low variance across all answers.
- Mostly neutral responses.
- Heavy extreme-answer patterns with little variation.

The assessment should not accuse the respondent of gaming the system.

If a response pattern is not interpretable, such as selecting the same answer for nearly all questions, using almost no variation, or selecting mostly neutral responses, the attempt should be saved, but the app should not present the output as a meaningful leadership profile. Instead, it should explain that the response pattern does not provide enough evidence to assign a leadership style.

## Result Output

Respondents should receive:

- Their assigned leadership style, or a clear no-classification result if the response pattern does not support assignment.
- A second style only if the evidence supports a true tie.
- A leadership map showing how the respondent's pattern lands across styles.
- A center-to-edge landing marker, where center indicates a broadly distributed pattern and edge indicates a more concentrated style pull.
- A pattern badge, such as Balanced, Mixed, or Defined, separate from the strongest leadership style. This label describes whether answers are spread across styles or point more toward one area of the style map; it is not a separate leadership type.
- Text labels, not raw numerical scores.
- A structured written output modeled on `Final Output.docx`: overview, strengths, potential challenges, coaching guidance, working with different team needs, development focus, and final summary.
- A brief lowest-scoring style note.

The result language must not contradict the provided dissertation-derived source materials.

Respondent-facing output must not reveal technical save status, database configuration, confidence labels, scoring internals, or debugging language. Those details are reserved for admin review and stored attempt records.

## Mock Result Preview

The app retains a mock result preview path for output validation during development. Its UI buttons are commented out so participants do not see development controls.

The mock preview uses 40 real questions from the active question bank and scores them through the same arithmetic scoring functions as a completed respondent attempt.

The current mock respondent is a coherent Transformational-led profile with moderate supporting tendencies and lower Autocratic/Transactional tendencies. It is marked as mock data and is not persisted.

## Benchmark Regression Testing

Scoring, question-selection, and classification changes should be checked against the benchmark fixture before release.

The benchmark lives in `benchmark/respondents.json` and currently includes 15 synthetic respondents covering clear single-style patterns, dual-style patterns, all-neutral responses, high-everywhere responses, low-everywhere responses, and inconsistent within-style responses.

Run:

```bash
node benchmark/run-benchmark.js
```

The benchmark should pass before pushing scoring or model changes. If an expectation changes intentionally, update the fixture and document why the new behavior is preferred.

## Persistence

The final product must be shareable by link on mobile and desktop.

Each assessment attempt must be saved permanently until manually purged by the owner.

Persisted data should include:

- Attempt metadata.
- Questions asked.
- Answer selected for each question.
- Whether each question came from the original source pool.
- Per-style scores.
- Assessment start, completion, and total duration for newly completed attempts.
- Initial response time per question for newly completed attempts; older attempts may show timing as not recorded.
- Response-quality indicators.
- Final style result.
- Full response text shown to the respondent.

If the same person takes the assessment multiple times, each attempt must be saved separately.

## Validity Language

Because the materials are dissertation-derived but may not be peer-reviewed, the app should use careful language such as:

- `Based on doctoral research in leadership`
- `Research-informed leadership style assessment`
- `Designed from dissertation-derived leadership framework materials`

The app should avoid unsupported claims such as:

- `Clinically validated`
- `Scientifically proven`
- `Diagnostic`
- `Peer-reviewed`, unless peer-reviewed publication evidence is later provided
