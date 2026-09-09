-- Candidate pay from Atelier employers. Run in the Supabase SQL editor.

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  employer_id uuid references public.profiles (id) on delete set null,
  application_id uuid,
  job_title text,
  company text,
  kind text not null,
  status text not null,
  amount numeric not null,
  currency text default 'USD',
  note text,
  created_at timestamptz default now()
);

alter table public.ledger_entries enable row level security;

drop policy if exists "ledger candidate" on public.ledger_entries;
create policy "ledger candidate"
on public.ledger_entries for select
using (auth.uid() = candidate_id);

drop policy if exists "ledger employer read" on public.ledger_entries;
create policy "ledger employer read"
on public.ledger_entries for select
using (auth.uid() = employer_id);

drop policy if exists "ledger employer write" on public.ledger_entries;
create policy "ledger employer write"
on public.ledger_entries for insert
with check (auth.uid() = employer_id);
