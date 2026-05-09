# Admin Analytics Plan

The admin panel is separate from the public assessment experience. Respondents should not see aggregate analytics, response-quality diagnostics, or trend analysis.

## Admin Goals

- Review every completed assessment attempt.
- Inspect exact question wording and selected answers.
- Track respondent trends over time when identity or labels are available.
- Identify low-quality response patterns without accusing respondents.
- Understand aggregate leadership-style trends across groups or time periods.
- Improve the assessment by finding confusing questions, low-discrimination items, and scoring ties.

## Attempt-Level Metrics

Each attempt should expose:

- Primary style or two-style tie.
- Per-style normalized scores.
- Confidence level.
- Questions asked.
- Completion timestamp.
- Response duration once timing is implemented.
- Answer distribution across the Likert scale.
- Straight-line ratio: highest single answer count divided by total answers.
- Neutral ratio: proportion of `Neutral` responses.
- Extreme ratio: proportion of `Strongly Agree` and `Strongly Disagree` responses.
- Response variance / standard deviation.
- Derived-question ratio.
- Quality flags.
- Whether the attempt is interpretable or needs review.

## Response-Quality Flags

Useful flags:

- Same answer for 85%+ of questions.
- Very low response variance.
- 85%+ neutral responses.
- Heavy extreme-answer pattern with little variation.
- Very fast completion time, once timing exists.
- Contradictory paired source/reverse-keyed answers, once more paired items exist.

Best practice is to mark these as quality concerns, not as cheating accusations.

## Aggregate Analytics

Aggregate admin views should include:

- Distribution of primary styles.
- Average score by style.
- Score spread by style.
- Tie frequency.
- Confidence distribution.
- Invalid/needs-review attempt rate.
- Completion length distribution.
- Most frequently asked adaptive follow-up questions.
- Most common low-scoring styles.
- Trends by week/month.

## Individual Trend Analytics

If respondents provide a name, email, cohort id, or anonymous participant id, the admin panel can show:

- All attempts for that respondent.
- Change in primary style over time.
- Change in per-style scores over time.
- Confidence changes over time.
- Response-quality changes over time.
- Comparison between a respondent and aggregate group averages.

## Item Analysis

Once enough data exists, evaluate individual question performance:

- Average answer by question.
- Standard deviation by question.
- Percent neutral by question.
- Item-total correlation within its leadership style.
- Questions that do not help differentiate styles.
- Questions with confusing or overly obvious wording.
- Questions that repeatedly appear in low-quality attempts.

## Admin Views

Recommended screens:

- Dashboard: aggregate style and quality overview.
- Attempts: searchable table of all completed attempts.
- Attempt Detail: full result, scores, answers, and flags.
- Respondents: longitudinal view by person or participant id.
- Items: question-level analytics and quality indicators.

## Privacy And Access

Admin analytics must require authentication.

Public respondents should only access:

- The assessment.
- Their own immediate result.

Admin data should never be exposed through client-side public keys or public database read policies.
