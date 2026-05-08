-- Supabase/Postgres schema for permanent leadership assessment persistence.
-- Assessment attempts should be retained until manually purged by the owner.

create table if not exists public.assessment_attempts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  respondent_label text,
  primary_styles text[] not null,
  confidence text not null,
  questions_asked integer not null,
  scores jsonb not null,
  response_quality jsonb not null,
  result_summary text not null,
  full_result jsonb not null
);

create table if not exists public.assessment_answers (
  id bigserial primary key,
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id text not null,
  question_text text not null,
  leadership_style text not null,
  answer_value integer not null check (answer_value between 1 and 5),
  scored_value integer not null check (scored_value between 1 and 5),
  direction text not null check (direction in ('positive', 'negative')),
  is_derived boolean not null default false,
  derived_from text,
  asked_order integer not null
);

create index if not exists assessment_attempts_created_at_idx
  on public.assessment_attempts (created_at desc);

create index if not exists assessment_answers_attempt_id_idx
  on public.assessment_answers (attempt_id);

-- Recommended production policy:
-- 1. Do not allow public read access to attempts or answers.
-- 2. Allow anonymous insert only through a server-side API route, not directly
--    from the browser with a service role key.
-- 3. Owner/admin review should require authenticated access.
