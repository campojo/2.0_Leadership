# Persistence Plan

The current static prototype saves completed attempts in browser `localStorage` so the scoring and result payload can be tested immediately.

That is not sufficient for the final product because the requirement is permanent owner-reviewable persistence across devices and repeated attempts.

## Final Architecture

Recommended production stack:

- Hosted web app: Next.js or another server-capable React framework
- Database: Supabase/Postgres
- Public assessment URL for respondents
- Server-side API route for saving attempts
- Private admin view for reviewing results

## Why Server-Side Saving

The app should not write directly to Supabase from the browser using privileged credentials.

Instead:

1. Respondent completes the assessment.
2. Browser sends the full result payload to `/api/attempts`.
3. Server validates the payload.
4. Server writes one row to `assessment_attempts`.
5. Server writes all asked questions and answers to `assessment_answers`.
6. Admin dashboard reads attempts after owner authentication.

## Persisted Fields

Each attempt should persist:

- Attempt id
- Timestamp
- Primary style or two-style tie
- Confidence level
- Per-style scores
- Response-quality flags
- Full result text shown to respondent
- Every question asked
- Every answer selected
- Scored value after reverse scoring
- Whether a question was source-based or derived
- Derived question provenance when applicable

## Manual Purge

Records should remain indefinitely until manually deleted by the owner.

Deletion should cascade from `assessment_attempts` to `assessment_answers`, as shown in `DATABASE_SCHEMA.sql`.
