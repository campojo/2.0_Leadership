-- Fix for existing Supabase databases created before weighted scoring.
-- The app stores raw answer choices as 1..5 in answer_value.
-- It stores weighted scoring as -3, -1, 0, 1, or 3 in scored_value.

alter table public.assessment_answers
  drop constraint if exists assessment_answers_scored_value_check;

alter table public.assessment_answers
  add constraint assessment_answers_scored_value_check
  check (scored_value between -3 and 3);

-- Optional repair for attempts saved before this constraint fix.
-- It backfills answer rows from assessment_attempts.full_result->answers
-- when an attempt has no answer rows yet.
insert into public.assessment_answers (
  attempt_id,
  question_id,
  question_text,
  leadership_style,
  answer_value,
  scored_value,
  direction,
  is_derived,
  derived_from,
  asked_order,
  answered_at
)
select
  attempt.id,
  answer_item ->> 'questionId',
  answer_item ->> 'text',
  answer_item ->> 'style',
  (answer_item ->> 'value')::integer,
  (answer_item ->> 'score')::integer,
  answer_item ->> 'direction',
  coalesce((answer_item ->> 'derived')::boolean, false),
  nullif(answer_item ->> 'derivedFrom', ''),
  answer_order::integer,
  attempt.created_at
from public.assessment_attempts attempt
cross join lateral jsonb_array_elements(attempt.full_result -> 'answers')
  with ordinality as answer_data(answer_item, answer_order)
where not exists (
  select 1
  from public.assessment_answers existing_answer
  where existing_answer.attempt_id = attempt.id
);
