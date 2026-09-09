-- Marketing films. Paste this in SQL Editor and Run.
-- Do not re-run the full schema.sql — existing policies stay as they are.

insert into storage.buckets (id, name, public, file_size_limit)
values ('films', 'films', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

create table if not exists public.brand_assets (
  slug text primary key,
  path text not null,
  url text,
  kind text not null default 'auth',
  audience text not null default 'shared',
  alt text,
  created_at timestamptz default now()
);

alter table public.brand_assets enable row level security;

drop policy if exists "public read brand assets" on public.brand_assets;
create policy "public read brand assets" on public.brand_assets for select using (true);

drop policy if exists "public read film files" on storage.objects;
create policy "public read film files"
on storage.objects for select
using (bucket_id = 'films');
