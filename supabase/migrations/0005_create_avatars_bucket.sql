-- Bucket public pour les photos de profil
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Politiques d'accès
create policy "Avatar upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Avatar read" on storage.objects
  for select using (bucket_id = 'avatars');
