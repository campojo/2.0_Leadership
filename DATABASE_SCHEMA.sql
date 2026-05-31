-- Supabase/Postgres schema for permanent leadership assessment persistence.
-- Assessment attempts should be retained until manually purged by the owner.

create table if not exists public.respondents (
  id uuid primary key,
  created_at timestamptz not null default now(),
  respondent_label text,
  email text,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.cohorts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.assessment_attempts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  respondent_id uuid references public.respondents(id) on delete set null,
  cohort_id uuid references public.cohorts(id) on delete set null,
  respondent_label text,
  email text,
  primary_styles text[] not null,
  confidence text not null,
  is_interpretable boolean not null default true,
  questions_asked integer not null,
  duration_seconds integer,
  scores jsonb not null,
  response_quality jsonb not null,
  straight_line_ratio numeric,
  neutral_ratio numeric,
  extreme_ratio numeric,
  response_variance numeric,
  derived_ratio numeric,
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
  asked_order integer not null,
  answered_at timestamptz,
  response_time_ms integer
);

create index if not exists respondents_email_idx
  on public.respondents (email);

create unique index if not exists respondents_email_unique_idx
  on public.respondents (email)
  where email is not null;

create index if not exists cohorts_name_idx
  on public.cohorts (name);

create index if not exists assessment_attempts_created_at_idx
  on public.assessment_attempts (created_at desc);

create index if not exists assessment_attempts_respondent_id_idx
  on public.assessment_attempts (respondent_id);

create index if not exists assessment_attempts_cohort_id_idx
  on public.assessment_attempts (cohort_id);

create index if not exists assessment_attempts_interpretable_idx
  on public.assessment_attempts (is_interpretable);

create index if not exists assessment_answers_attempt_id_idx
  on public.assessment_answers (attempt_id);

create index if not exists assessment_answers_question_id_idx
  on public.assessment_answers (question_id);

create index if not exists assessment_answers_leadership_style_idx
  on public.assessment_answers (leadership_style);

-- Recommended production policy:
-- 1. Do not allow public read access to attempts or answers.
-- 2. Allow anonymous insert only through a server-side API route, not directly
--    from the browser with a service role key.
-- 3. Owner/admin review should require authenticated access.
