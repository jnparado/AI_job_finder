-- Brand photos only. Paste this in SQL Editor and Run.
-- Do not re-run the full schema.sql — profiles policies already exist.

insert into storage.buckets (id, name, public)
values ('brand', 'brand', true)
on conflict (id) do update set public = true;

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

drop policy if exists "public read brand files" on storage.objects;
create policy "public read brand files"
on storage.objects for select
using (bucket_id = 'brand');
