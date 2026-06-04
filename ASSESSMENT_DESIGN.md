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

## Source Data Correction

The current `Questions 2.0 (5).xlsx` workbook labels one question block as `Autocratic Leadership`, but the questions in that block measure openness, honesty, feedback-seeking, ethics, and role modeling rather than autocratic leadership.

That mislabeled Autocratic source block is excluded from scoring. The app uses corrected Autocratic items derived from the approved Autocratic descriptions in `Final Output.docx` and `H-M-L Scores v2.docx.pdf`.

This correction prevents general positive leadership behaviors from being incorrectly scored as Autocratic leadership.

## Minimum Coverage

At least five scored questions from every leadership style must be answered before a result can be produced.

The required baseline is five questions per style, randomized and interleaved, for 40 total questions.

Baseline questions should come from the original source question pool whenever the source block correctly maps to the style being measured. The corrected Autocratic item pool is used instead of the original mislabeled Autocratic source block.

## Adaptive Questioning

The current 40-question design uses the full baseline as the assessment. Adaptive follow-up logic remains available in the codebase for future experimentation, but the production flow does not stop early or ask fewer than 40 questions.

If adaptive follow-up is reintroduced later, follow-up questions should be selected when:

- The leading styles are close.
- More than two styles are scoring high together.
- A style has internally inconsistent responses.
- A respondent gives a mix of strong disagreement, strong agreement, and neutral answers within the same style.
- The top style does not have enough separation from the second style.
- The system needs to distinguish between two plausible styles.

The assessment may return two equally likely styles, but only after additional targeted questions support a true two-style result. It should never return more than two primary styles.

If more than two styles remain high and close together after targeted questioning, the app should use relative evidence indicators to select the strongest style rather than withholding a result solely because the respondent endorsed many positive leadership behaviors.

## Review Navigation

Respondents may go back to review previous questions.

Rules:

- Respondents cannot skip an unanswered question.
- Going backward must preserve prior answers.
- If a respondent selects a different answer on a previous question, that answer is updated.
- Already asked questions remain in the sequence so review does not unexpectedly erase answers.

## Derived Negative-Framed And Contrast Questions

The source workbook currently contains positive-framed questions. To improve measurement quality, the app may include a small number of derived negative-framed questions and contrast questions.

These questions are not new leadership theory. They must preserve the source constructs and should be traceable to either a source question or the approved final output/style-description materials.

Example:

- Source construct: `I often communicate a clear and inspiring vision of the future.`
- Derived reverse-keyed version: `I rarely connect day-to-day work to a clear future direction.`

Policy:

- Derived questions should be used sparingly.
- The preferred target is 0-10% of asked questions.
- The hard ceiling is 25% of asked questions.
- Derived questions should mainly support response-quality checks, agreement-bias checks, score differentiation, and high-score cluster resolution.
- Every derived item should store provenance: style, source question or source document, and scoring direction.

## Scoring

Responses should be scored on a Likert scale.

Positive items score in the normal direction. Negative-framed derived items are reverse-scored.

Style scores should use the answered questions for that style. Scores should be normalized so styles can be compared even if adaptive questioning asks different counts per style.

## Classification and Response Quality

The app may calculate confidence and diagnostic values internally for admin review, but respondent-facing output should be decisive: assign one style, assign two styles only when justified, or assign no style only when the response pattern itself is not interpretable.

Signals include:

- Separation between the top style and second style.
- Number of questions answered for the leading style.
- Relative support indicators, such as strong scored answers, contradictions, and style averages.
- Internal consistency within each style.
- Straight-lining behavior, such as selecting the same answer repeatedly.
- Low variance across all answers.
- Contradictions between paired positive and reverse-keyed items.

The assessment should not accuse the respondent of gaming the system. It may withhold classification only when response quality is weak enough that the pattern is not interpretable.

If a response pattern is not interpretable, such as selecting the same answer for nearly all questions, using almost no variation, or selecting mostly neutral responses, the attempt should be saved, but the app should not present the output as a meaningful leadership profile. Instead, it should explain that the response pattern does not provide enough evidence to assign a leadership style.

## Result Output

Respondents should receive:

- Their assigned leadership style, or a clear no-classification result if the response pattern does not support assignment.
- A second style only if the evidence supports a true tie.
- A visual showing which styles they are most like and least like.
- A score visual that does not repeat the written interpretation.
- A structured written output modeled on `Final Output.docx`: overview, strengths, potential challenges, coaching guidance, working with different team needs, development focus, and final summary.
- A brief lowest-scoring style note.

The result language must not contradict the provided dissertation-derived source materials.

Respondent-facing output must not reveal technical save status, database configuration, confidence labels, scoring internals, or debugging language. Those details are reserved for admin review and stored attempt records.

## Benchmark Regression Testing

Scoring, adaptive-questioning, and classification changes should be checked against the benchmark fixture before release.

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
- Whether each question was source-based or derived.
- Per-style scores.
- Confidence indicators.
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
