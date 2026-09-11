-- AI Job Assistant — run this in the Supabase SQL editor (or via CLI).
-- Dashboard → SQL → New query → paste → Run.
-- Then: Authentication → Providers → enable Email, Google, Facebook (Meta),
-- LinkedIn, Twitter, Apple, GitHub, Discord, Slack.
-- Site URL: http://localhost:5173
-- Redirect URLs: http://localhost:5173/auth/callback
-- Google OAuth redirect also: https://YOUR_PROJECT.supabase.co/auth/v1/callback

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  country text,
  city text,
  headline text,
  current_title text,
  desired_title text,
  years_experience integer default 0,
  industry text,
  career_level text,
  work_modes text[] default '{}',
  employment_types text[] default '{}',
  salary_min numeric,
  salary_desired numeric,
  currency text default 'USD',
  locations text[] default '{}',
  remote_worldwide boolean default false,
  career_goals text,
  onboarding_completed boolean default false,
  resume_text text,
  parsed_profile jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  kind text not null default 'core',
  unique (user_id, name, kind)
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  company text,
  start_date text,
  end_date text,
  is_current boolean default false,
  bullets text[] default '{}'
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school text,
  degree text,
  field text,
  year text
);

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

create table if not exists public.job_sources (
  id text primary key,
  name text not null,
  kind text not null,
  authorized boolean default true
);

create table if not exists public.jobs (
  id text primary key,
  source text references public.job_sources (id),
  source_job_id text,
  canonical_key text,
  title text not null,
  company text not null,
  description text,
  location text,
  remote boolean default false,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  currency text default 'USD',
  skills text[] default '{}',
  required_skills text[] default '{}',
  preferred_skills text[] default '{}',
  required_experience integer,
  seniority text,
  application_url text,
  apply_channel text,
  posted_at date,
  analysis jsonb,
  listing_status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.jobs (id) on delete cascade,
  source text not null,
  source_url text,
  source_job_id text
);

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id text not null references public.jobs (id) on delete cascade,
  overall_score integer not null,
  skills_score integer,
  experience_score integer,
  title_score integer,
  salary_score integer,
  location_score integer,
  employment_score integer,
  seniority_score integer,
  career_score integer,
  matched_skills text[] default '{}',
  missing_skills text[] default '{}',
  ai_summary text,
  ai_recommendation text,
  category text,
  status text default 'new',
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id text not null references public.jobs (id),
  match_id uuid references public.job_matches (id),
  status text not null default 'draft',
  channel text,
  authorized boolean default false,
  tailored_resume text,
  cover_letter text,
  recruiter_message text,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  question text not null,
  answer text,
  approved boolean default false
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  at timestamptz default now(),
  label text not null,
  detail text
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  kind text not null,
  to_name text,
  body text,
  approved boolean default false,
  sent boolean default false,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  href text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.agent_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean default false,
  run_hour integer default 8,
  min_match integer default 80,
  max_jobs integer default 20
);

create table if not exists public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  agent text not null,
  status text not null,
  stats jsonb,
  created_at timestamptz default now()
);

insert into public.job_sources (id, name, kind, authorized) values
  ('linkedin', 'LinkedIn', 'ats', true),
  ('indeed', 'Indeed', 'ats', true),
  ('greenhouse', 'Greenhouse / career page', 'career_page', true),
  ('lever', 'Lever / career page', 'career_page', true),
  ('career_page', 'Employer career page', 'career_page', true),
  ('feed', 'Permitted job feed', 'feed', true),
  ('api', 'Licensed job API', 'api', true)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_role text := coalesce(new.raw_user_meta_data->>'role', 'candidate');
  meta_company text := nullif(new.raw_user_meta_data->>'company_name', '');
begin
  insert into public.profiles (id, email, role, company_name, onboarding_completed)
  values (
    new.id,
    new.email,
    case when meta_role = 'employer' then 'employer' else 'candidate' end,
    meta_company,
    meta_role = 'employer'
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when public.profiles.role in ('admin', 'super_admin') then public.profiles.role
      else coalesce(excluded.role, public.profiles.role)
    end,
    company_name = coalesce(excluded.company_name, public.profiles.company_name),
    onboarding_completed = public.profiles.onboarding_completed or excluded.onboarding_completed;
  insert into public.agent_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_staff_role()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.role in ('admin', 'super_admin') then
    new.role := old.role;
  elsif new.role not in ('candidate', 'employer') then
    new.role := case
      when tg_op = 'UPDATE' and old.role in ('candidate', 'employer') then old.role
      else 'candidate'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_staff_role on public.profiles;
create trigger protect_profile_staff_role
before insert or update on public.profiles
for each row execute function public.protect_profile_staff_role();

alter table public.profiles enable row level security;
alter table public.user_skills enable row level security;
alter table public.experiences enable row level security;
alter table public.education enable row level security;
alter table public.resumes enable row level security;
alter table public.jobs enable row level security;
alter table public.job_sources enable row level security;
alter table public.job_listings enable row level security;
alter table public.job_matches enable row level security;
alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_events enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.agent_settings enable row level security;
alter table public.ai_agent_runs enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own skills" on public.user_skills;
create policy "own skills" on public.user_skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own experience" on public.experiences;
create policy "own experience" on public.experiences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own education" on public.education;
create policy "own education" on public.education for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own resumes" on public.resumes;
create policy "own resumes" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "read jobs" on public.jobs;
create policy "read jobs" on public.jobs for select using (auth.role() = 'authenticated');
drop policy if exists "read sources" on public.job_sources;
create policy "read sources" on public.job_sources for select using (auth.role() = 'authenticated');
drop policy if exists "read listings" on public.job_listings;
create policy "read listings" on public.job_listings for select using (auth.role() = 'authenticated');
drop policy if exists "own matches" on public.job_matches;
create policy "own matches" on public.job_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own answers" on public.application_answers;
create policy "own answers" on public.application_answers for all
  using (exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()));
drop policy if exists "own events" on public.application_events;
create policy "own events" on public.application_events for all
  using (exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()));
drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own agent settings" on public.agent_settings;
create policy "own agent settings" on public.agent_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own agent runs" on public.ai_agent_runs;
create policy "own agent runs" on public.ai_agent_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "own resume files" on storage.objects;
create policy "own resume files"
on storage.objects for all
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- Employer accounts: post jobs on Atelier; approved candidate packets land in their inbox.
alter table public.profiles add column if not exists role text default 'candidate';
update public.profiles
set role = case
  when lower(trim(coalesce(role, ''))) in ('employer', 'hiring') then 'employer'
  when lower(trim(coalesce(role, ''))) in ('admin') then 'admin'
  when lower(trim(coalesce(role, ''))) in ('super_admin', 'superadmin', 'super-admin') then 'super_admin'
  else 'candidate'
end
where role is null or lower(trim(coalesce(role, ''))) not in ('candidate', 'employer', 'admin', 'super_admin');
alter table public.profiles alter column role set default 'candidate';
alter table public.profiles alter column role set not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('candidate', 'employer', 'admin', 'super_admin'));
comment on column public.profiles.role is 'Account type: candidate, employer, admin, or super_admin.';
alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists company_website text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists locale text;
alter table public.profiles add column if not exists identities jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists social_links jsonb default '{}'::jsonb;
alter table public.jobs add column if not exists employer_id uuid references public.profiles (id) on delete set null;
alter table public.jobs add column if not exists listing_status text default 'active';
alter table public.jobs drop constraint if exists jobs_listing_status_check;
alter table public.jobs add constraint jobs_listing_status_check check (listing_status in ('active', 'closed'));
drop policy if exists "employers delete own jobs" on public.jobs;
create policy "employers delete own jobs" on public.jobs for delete
  using (employer_id = auth.uid());
alter table public.applications add column if not exists delivered_to_employer boolean default false;

insert into public.job_sources (id, name, kind, authorized)
values ('atelier', 'Atelier employers', 'direct', true)
on conflict (id) do nothing;

drop policy if exists "employers post jobs" on public.jobs;
create policy "employers post jobs" on public.jobs for insert
  with check (employer_id = auth.uid());
drop policy if exists "employers update own jobs" on public.jobs;
create policy "employers update own jobs" on public.jobs for update
  using (employer_id = auth.uid()) with check (employer_id = auth.uid());
drop policy if exists "employers read inbox" on public.applications;
create policy "employers read inbox" on public.applications for select
  using (exists (
    select 1 from public.jobs j
    where j.id = job_id and j.employer_id = auth.uid()
  ));
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id text not null,
  status text not null default 'active',
  provider text,
  provider_ref text,
  interval text default 'month',
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists "own subscription" on public.subscriptions;
create policy "own subscription" on public.subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "employers update inbox" on public.applications;
create policy "employers update inbox" on public.applications for update
  using (exists (
    select 1 from public.jobs j
    where j.id = job_id and j.employer_id = auth.uid()
  ));

-- Public brand photos for login / signup (Storage bucket + metadata rows).
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

insert into storage.buckets (id, name, public, file_size_limit)
values ('films', 'films', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "public read film files" on storage.objects;
create policy "public read film files"
on storage.objects for select
using (bucket_id = 'films');

-- Two-way messages on Atelier applications (candidate ↔ employer). API uses the service role.
create table if not exists public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null check (sender_role in ('candidate', 'employer')),
  body text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists thread_messages_app_idx on public.thread_messages (application_id, created_at);

alter table public.thread_messages enable row level security;

drop policy if exists "thread participants read" on public.thread_messages;
create policy "thread participants read" on public.thread_messages for select using (
  sender_id = auth.uid()
  or exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid())
  or exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = application_id and j.employer_id = auth.uid()
  )
);

drop policy if exists "thread participants insert" on public.thread_messages;
create policy "thread participants insert" on public.thread_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid())
      or exists (
        select 1 from public.applications a
        join public.jobs j on j.id = a.job_id
        where a.id = application_id and j.employer_id = auth.uid()
      )
    )
  );

drop policy if exists "thread participants update read" on public.thread_messages;
create policy "thread participants update read" on public.thread_messages for update
  using (
    exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid())
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = application_id and j.employer_id = auth.uid()
    )
  );
