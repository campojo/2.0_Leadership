-- Supabase verification queries for the leadership assessment.
-- Run these in Supabase SQL Editor after completing a test assessment.

-- 1. Confirm records exist in each table.
select 'respondents' as table_name, count(*) as row_count from public.respondents
union all
select 'assessment_attempts' as table_name, count(*) as row_count from public.assessment_attempts
union all
select 'assessment_answers' as table_name, count(*) as row_count from public.assessment_answers;

-- 2. Show the most recent completed attempts.
select
  id,
  created_at,
  respondent_label,
  email,
  primary_styles,
  is_interpretable,
  questions_asked,
  scores
from public.assessment_attempts
order by created_at desc
limit 10;

-- 3. Show answer rows for the most recent attempt.
select
  aa.asked_order,
  aa.leadership_style,
  aa.answer_value,
  aa.scored_value,
  aa.direction,
  aa.question_text
from public.assessment_answers aa
where aa.attempt_id = (
  select id
  from public.assessment_attempts
  order by created_at desc
  limit 1
)
order by aa.asked_order;

-- 4. Check whether every attempt has matching answer rows.
select
  attempt.id,
  attempt.respondent_label,
  attempt.questions_asked,
  count(answer.id) as stored_answer_rows
from public.assessment_attempts attempt
left join public.assessment_answers answer
  on answer.attempt_id = attempt.id
group by attempt.id, attempt.respondent_label, attempt.questions_asked
order by attempt.created_at desc
limit 25;
