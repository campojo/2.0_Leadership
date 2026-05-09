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

The app must ask no more than 40 scored assessment questions.

The design goal is to ask fewer than 40 whenever confidence is sufficient. The assessment should not continue asking questions merely to fill a quota.

## Randomization

Questions must be randomized so respondents do not receive all questions from one leadership style in a block.

The baseline phase should include coverage across every leadership style before narrowing adaptively.

During the assessment, the app must not display the leadership style/category associated with the current question. This reduces obvious response gaming, especially for styles respondents may perceive as desirable or undesirable.

## Instructions

The assessment opens with an instruction screen based on `Instructions for Taking the Leadership Assessment.docx.pdf`.

The start screen explains that the assessment is a self-assessment, asks respondents to answer honestly, discourages overthinking, and clarifies that there is no perfect leadership style.

## Question Wording

The assessment is a self-assessment, so displayed questions should be phrased in first person wherever possible.

If source content uses third-person language such as `The leader...`, the app converts the displayed question to first person while preserving the original construct.

## Minimum Coverage

At least one scored question from every leadership style must be answered before a result can be produced.

The preferred baseline is two questions per style, randomized, for 16 initial questions. This gives each style an initial signal while keeping the assessment short.

## Adaptive Questioning

After the baseline phase, the app should ask follow-up questions only where they improve classification quality.

Follow-up questions should be selected when:

- The leading styles are close.
- A style has internally inconsistent responses.
- A respondent gives a mix of strong disagreement, strong agreement, and neutral answers within the same style.
- The top style does not have enough separation from the second style.
- The system needs to distinguish between two plausible styles.

The assessment may return two equally likely styles, but only after additional targeted questions fail to create a reliable distinction. It should never return more than two primary styles.

## Review Navigation

Respondents may go back to review previous questions.

Rules:

- Respondents cannot skip an unanswered question.
- Going backward must preserve prior answers.
- If a respondent selects a different answer on a previous question, that answer is updated.
- Already asked questions remain in the sequence so review does not unexpectedly erase answers.

## Derived Negative-Framed Questions

The source workbook currently contains positive-framed questions. To improve measurement quality, the app may include a small number of derived negative-framed questions.

These questions are not new leadership theory. They must preserve the construct of a specific source question and should be traceable to that source question.

Example:

- Source construct: `I often communicate a clear and inspiring vision of the future.`
- Derived reverse-keyed version: `I rarely connect day-to-day work to a clear future direction.`

Policy:

- Derived questions should be used sparingly.
- The preferred target is 0-10% of asked questions.
- The hard ceiling is 25% of asked questions.
- Derived questions should mainly support response-quality checks, agreement-bias checks, and score confidence.
- Every derived item should store provenance: style, source question, and reverse-scored direction.

## Scoring

Responses should be scored on a Likert scale.

Positive items score in the normal direction. Negative-framed derived items are reverse-scored.

Style scores should use the answered questions for that style. Scores should be normalized so styles can be compared even if adaptive questioning asks different counts per style.

## Confidence and Response Quality

The app should calculate a confidence level for the final classification.

Signals include:

- Separation between the top style and second style.
- Number of questions answered for the leading style.
- Internal consistency within each style.
- Straight-lining behavior, such as selecting the same answer repeatedly.
- Low variance across all answers.
- Contradictions between paired positive and reverse-keyed items.

The assessment should not accuse the respondent of gaming the system. It may mark a result as lower confidence and recommend retaking if response quality is weak.

If a response pattern is not interpretable, such as selecting the same answer for nearly all questions or using almost no variation, the respondent should still be allowed to finish. The attempt should be saved, but the app should not present the output as a meaningful leadership profile. Instead, it should explain that the response pattern does not support a reliable interpretation and recommend retaking the assessment.

## Result Output

Respondents should receive:

- Their most likely leadership style.
- A second style only if the evidence supports a true tie.
- A visual showing which styles they are most like and least like.
- Brief descriptions of all leadership styles.
- A detailed explanation for the primary style.
- Practical strengths and possible challenges grounded in the provided materials.

The result language must not contradict the provided dissertation-derived source materials.

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
