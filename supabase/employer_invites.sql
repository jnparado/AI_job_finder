-- Employer invites sent from the admin desk. Run in the Supabase SQL editor.
-- Status stays "sent" until an employer account matches the company name.

create table if not exists public.employer_invites (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  title text,
  source text,
  status text not null default 'sent',
  invited_by uuid references public.profiles (id) on delete set null,
  invited_at timestamptz default now(),
  unique (company)
);

alter table public.employer_invites enable row level security;
