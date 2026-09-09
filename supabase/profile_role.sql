-- Run this in the Supabase SQL editor. Do not recreate public.profiles.
-- Role is already on the table; this locks it to candidate | employer | admin | super_admin.
-- Public signup cannot grant staff roles. Promote in SQL, for example:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';

alter table public.profiles add column if not exists role text default 'candidate';

update public.profiles
set role = case
  when lower(trim(coalesce(role, ''))) in ('employer', 'hiring') then 'employer'
  when lower(trim(coalesce(role, ''))) in ('admin') then 'admin'
  when lower(trim(coalesce(role, ''))) in ('super_admin', 'superadmin', 'super-admin') then 'super_admin'
  else 'candidate'
end
where role is null
   or lower(trim(coalesce(role, ''))) not in ('candidate', 'employer', 'admin', 'super_admin');

alter table public.profiles alter column role set default 'candidate';
alter table public.profiles alter column role set not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('candidate', 'employer', 'admin', 'super_admin'));

comment on column public.profiles.role is 'Account type: candidate, employer, admin, or super_admin.';

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

