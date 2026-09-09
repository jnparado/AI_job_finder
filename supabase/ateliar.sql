-- Ateliar time sessions for hired candidates. Run in the Supabase SQL editor.

create table if not exists public.ateliar_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  employer_id uuid references public.profiles (id) on delete set null,
  application_id uuid,
  job_title text,
  company text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  seconds integer default 0,
  note text,
  created_at timestamptz default now()
);

alter table public.ateliar_sessions enable row level security;

drop policy if exists "ateliar candidate" on public.ateliar_sessions;
create policy "ateliar candidate"
on public.ateliar_sessions for all
using (auth.uid() = candidate_id)
with check (auth.uid() = candidate_id);

drop policy if exists "ateliar employer read" on public.ateliar_sessions;
create policy "ateliar employer read"
on public.ateliar_sessions for select
using (auth.uid() = employer_id);
