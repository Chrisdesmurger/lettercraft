alter table if exists user_profiles
  add column if not exists bio text,
  add column if not exists avatar_url text;

