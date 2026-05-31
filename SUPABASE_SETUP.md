# Supabase Database Setup

This project now includes a Vercel serverless API route at `/api/attempts`.

The browser sends completed assessment payloads to that route. The route writes permanent records to Supabase Postgres using server-side environment variables.

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

The Supabase service-role key. This key must only be stored in Vercel environment variables. Do not put it in `app.js`, `index.html`, or any browser-loaded file.

`ADMIN_REVIEW_TOKEN`

Optional temporary token for protected `GET /api/attempts` review access before the admin dashboard exists.

## 3. Redeploy

Redeploy the Vercel project after adding the environment variables.

## 4. Test The Save Flow

Complete one assessment from the public URL.

On the result screen, the save status should say:

`Saved locally and to the review database.`

Then verify Supabase rows were created in:

- `respondents`
- `assessment_attempts`
- `assessment_answers`

Each completed attempt should create one `assessment_attempts` row and one `assessment_answers` row per question answered.

## 5. Temporary API Review

Before the admin dashboard is built, recent attempts can be reviewed through:

`GET /api/attempts`

The request must include this header:

`x-admin-token: <ADMIN_REVIEW_TOKEN>`

This is a temporary review path. The production admin panel should use authenticated admin access instead.
