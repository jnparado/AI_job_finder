-- Run this in the Supabase SQL editor so candidate resume uploads can save.
-- Private bucket: only the signed-in owner can read/write their folder.

insert into storage.buckets (id, name, public, file_size_limit)
values ('resumes', 'resumes', false, 8388608)
on conflict (id) do update set public = false, file_size_limit = 8388608;

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_path text,
  file_name text,
  mime_type text,
  extracted_text text,
  parsed jsonb,
  is_primary boolean default true,
  created_at timestamptz default now()
);

alter table public.resumes enable row level security;

drop policy if exists "own resumes" on public.resumes;
create policy "own resumes" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own resume files" on storage.objects;
drop policy if exists "resume select" on storage.objects;
drop policy if exists "resume insert" on storage.objects;
drop policy if exists "resume update" on storage.objects;
drop policy if exists "resume delete" on storage.objects;

create policy "resume select"
on storage.objects for select
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resume insert"
on storage.objects for insert
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resume update"
on storage.objects for update
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resume delete"
on storage.objects for delete
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
