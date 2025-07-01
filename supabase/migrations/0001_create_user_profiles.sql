create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  country text,
  language text,
  birth_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "Allow individual user access" on user_profiles
  for all using ( auth.uid() = user_id );
