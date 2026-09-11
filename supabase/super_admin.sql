-- Super admin is SQL-only. Signup and the admin desk cannot grant this role.
-- Run in the Supabase SQL editor (postgres), then sign out and sign back in.

update public.profiles
set role = 'super_admin'
where lower(email) = 'jeson.ideahub@gmail.com';

-- If the row did not change, the staff-role trigger blocked it. Use this once:
-- alter table public.profiles disable trigger protect_profile_staff_role;
-- update public.profiles set role = 'super_admin' where lower(email) = 'jeson.ideahub@gmail.com';
-- alter table public.profiles enable trigger protect_profile_staff_role;

select id, email, role
from public.profiles
where lower(email) = 'jeson.ideahub@gmail.com';
