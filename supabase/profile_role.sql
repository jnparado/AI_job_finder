-- Run this in the Supabase SQL editor. Do not recreate public.profiles.
-- Role is already on the table; this locks it to candidate | employer.

alter table public.profiles add column if not exists role text default 'candidate';

update public.profiles
set role = case
  when lower(trim(coalesce(role, ''))) in ('employer', 'hiring') then 'employer'
  else 'candidate'
end
where role is null
   or lower(trim(coalesce(role, ''))) not in ('candidate', 'employer');

alter table public.profiles alter column role set default 'candidate';
alter table public.profiles alter column role set not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('candidate', 'employer'));

comment on column public.profiles.role is 'Account type: candidate or employer.';
