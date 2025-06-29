-- Migration pour la table de réponses au questionnaire d'onboarding
create table if not exists onboarding_responses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  category text,
  question_id text,
  response text,
  created_at timestamp with time zone default now()
);

-- Utilisé pour l'upsert des réponses
create unique index if not exists onboarding_response_user_question_idx
  on onboarding_responses(user_id, category, question_id);
