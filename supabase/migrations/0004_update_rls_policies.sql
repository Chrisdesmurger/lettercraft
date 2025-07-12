-- Update row level security policies to enforce auth.uid() checks
-- This migration modifies existing policies on user_profiles and candidates_profile
-- to include WITH CHECK conditions matching auth.uid() = user_id

alter policy "Allow individual user access" on user_profiles
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter policy "Allow individual user access" on candidates_profile
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
