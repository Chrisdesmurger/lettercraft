create table if not exists candidates_profile (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  language text not null,
  description text,
  file_url text not null,
  uploaded_at timestamptz default now(),
  first_name text,
  last_name text,
  experiences text[],
  skills text[],
  education text[]
);

alter table candidates_profile enable row level security;

create policy "Allow individual user access" on candidates_profile
  for all using ( auth.uid() = user_id );
