# Admin Analytics Plan

The admin panel is separate from the public assessment experience. Respondents should not see aggregate analytics, response-quality diagnostics, or trend analysis.

## Current Foundation

The first admin analytics release is implemented as an unlinked `/admin.html` application. It requests protected data from `/api/analytics` using `ADMIN_REVIEW_TOKEN`, while Supabase credentials remain server-side. The participant assessment does not link to, load, or depend on the admin files.

Admins can use rolling period presets or an inclusive custom calendar range. Custom ranges are converted to exact local-day boundaries in the browser and enforced by the server query, allowing a seminar or cohort window to exclude development and test attempts without deleting them.

Currently implemented views include:

- Overview metrics and weekly assessment activity.
- Primary-style distribution with dual-style allocation.
- Average arithmetic tendency scores by style.
- Response-quality and unassigned-profile summaries.
- Searchable recent attempts with score and flag detail.
- Repeat-respondent history.
- Likert response distribution and descriptive question statistics.
- Click-through respondent histories with every stored attempt, question, answer, style score, and recorded completion time.
- Click-through question histories with respondent-level response records and weekly context.
- Preliminary question review alerts at any response count, based on response variation, neutral use, ceiling/floor effects, and corrected item-total relationship. Response counts remain visible so small-sample signals can be interpreted cautiously.

The shared token is appropriate for an owner-only prototype. Replace it with account-based authentication and roles before giving multiple administrators access.

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
- Per-style weighted arithmetic scores.
- Confidence level.
- Questions asked.
- Completion timestamp.
- Total assessment duration for newly completed attempts.
- Initial question response time for newly completed attempts.
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
- Corrected item-total correlation that removes the current item's score from its style total.
- Questions that do not help differentiate styles.
- Questions with confusing or overly obvious wording.
- Questions that repeatedly appear in low-quality attempts.

The dashboard currently evaluates review signals at every response count because early cohorts may be small. These signals are preliminary expert-review prompts, not automatic findings that a question is ineffective or automatic removal decisions. A formal minimum-sample threshold can be restored once the assessment has accumulated enough production data.

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
