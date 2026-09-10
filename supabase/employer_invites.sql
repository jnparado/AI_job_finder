-- Employer invites sent from the admin desk. Run in the Supabase SQL editor.
-- Status stays "sent" until an employer account matches the company name.

create table if not exists public.employer_invites (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  company_key text,
  title text,
  source text,
  status text not null default 'sent',
  invited_by uuid,
  invited_at timestamptz default now()
);

alter table public.employer_invites add column if not exists company_key text;
alter table public.employer_invites add column if not exists title text;
alter table public.employer_invites add column if not exists source text;
alter table public.employer_invites add column if not exists status text;
alter table public.employer_invites add column if not exists invited_by uuid;
alter table public.employer_invites add column if not exists invited_at timestamptz;

update public.employer_invites
set company_key = lower(trim(company))
where company_key is null and company is not null;

create unique index if not exists employer_invites_company_key
  on public.employer_invites (company_key);

alter table public.employer_invites enable row level security;
