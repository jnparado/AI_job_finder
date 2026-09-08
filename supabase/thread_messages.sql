-- Two-way messages on Atelier applications (candidate ↔ employer).
-- Run this in the Supabase SQL editor if the database already exists.
-- The API uses the service role; these policies cover direct client access.

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
