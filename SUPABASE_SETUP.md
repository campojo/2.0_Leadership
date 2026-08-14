# Supabase And Email Setup

This project now includes a Vercel serverless API route at `/api/attempts`.

The browser sends completed assessment payloads to that route. The route can write permanent records to Supabase Postgres and can send result emails through Resend using server-side environment variables.

Supabase is needed for permanent database review. Resend is needed for participant result emails. They can be configured independently.

## 1. Create The Supabase Project

Create a Supabase project from the Supabase dashboard.

After the project is ready, open the SQL editor and run the full contents of:

`DATABASE_SCHEMA.sql`

This creates:

- `respondents`
- `cohorts`
- `assessment_attempts`
- `assessment_answers`

## 2. Add Vercel Environment Variables

In the Vercel project settings, add these environment variables:

`SUPABASE_URL`

The Supabase project URL.

`SUPABASE_SERVICE_ROLE_KEY`

The Supabase server-side key. With the newer Supabase API key screen, this is the secret key that starts with `sb_secret_`. With the legacy API key screen, this is the `service_role` key. This key must only be stored in Vercel environment variables. Do not put it in `app.js`, `index.html`, or any browser-loaded file.

`ADMIN_REVIEW_TOKEN`

Optional temporary token for protected `GET /api/attempts` review access before the admin dashboard exists.

`RESEND_API_KEY`

API key from Resend for sending participant result emails.

`RESULT_EMAIL_FROM`

Verified sender address used for result emails, such as `Leadership Assessment <results@yourdomain.com>`.

## 3. Redeploy

Redeploy the Vercel project after adding the environment variables.

## 4. Test The Save Flow

Complete one assessment from the public URL.

Then verify Supabase rows were created in:

- `respondents`
- `assessment_attempts`
- `assessment_answers`

Each completed attempt should create one `assessment_attempts` row and one `assessment_answers` row per question answered.

If `respondents` and `assessment_attempts` receive rows but `assessment_answers` stays empty, run:

`SUPABASE_FIX_SCORED_VALUE_CONSTRAINT.sql`

This updates older databases created before weighted answer scores were changed to `-3`, `-1`, `0`, `1`, and `3`.

If Resend is configured, the respondent should also receive a result email.

## 5. Temporary API Review

Before the admin dashboard is built, recent attempts can be reviewed through:

`GET /api/attempts`

The request must include this header:

`x-admin-token: <ADMIN_REVIEW_TOKEN>`

This is a temporary review path. The production admin panel should use authenticated admin access instead.
