-- Employer listings can stay on My Jobs after they leave candidate search.
alter table public.jobs add column if not exists listing_status text default 'active';
update public.jobs set listing_status = 'active' where listing_status is null;
alter table public.jobs drop constraint if exists jobs_listing_status_check;
alter table public.jobs add constraint jobs_listing_status_check check (listing_status in ('active', 'closed'));
comment on column public.jobs.listing_status is 'active = in candidate search; closed = hidden from search, applicants kept.';

drop policy if exists "employers delete own jobs" on public.jobs;
create policy "employers delete own jobs" on public.jobs for delete
  using (employer_id = auth.uid());
