-- Repair / create employer so password login works.
-- Run in the Supabase SQL editor, then sign in at /login?role=employer
-- Email: chadsautara@gmail.com
-- Password: AtelierHire2026!

do $$
declare
  v_email text := 'chadsautara@gmail.com';
  v_password text := 'AtelierHire2026!';
  v_company text := 'Sautara';
  v_first text := 'Chad';
  v_last text := 'Sautara';
  v_id uuid;
  v_hash text := extensions.crypt(v_password, extensions.gen_salt('bf', 10));
begin
  select id into v_id from auth.users where lower(email) = lower(v_email) limit 1;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      v_hash,
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'role', 'employer',
        'company_name', v_company,
        'first_name', v_first,
        'last_name', v_last
      ),
      now(),
      now(),
      '',
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set
      encrypted_password = v_hash,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      aud = 'authenticated',
      role = 'authenticated',
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'role', 'employer',
          'company_name', v_company,
          'first_name', v_first,
          'last_name', v_last
        ),
      confirmation_token = '',
      recovery_token = '',
      email_change = '',
      updated_at = now()
    where id = v_id;
  end if;

  delete from auth.identities
  where user_id = v_id and provider = 'email';

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_id::text,
    v_id,
    jsonb_build_object(
      'sub', v_id::text,
      'email', lower(v_email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, email, role, first_name, last_name, company_name, onboarding_completed)
  values (v_id, lower(v_email), 'employer', v_first, v_last, v_company, true)
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when public.profiles.role in ('admin', 'super_admin') then public.profiles.role
      else 'employer'
    end,
    first_name = v_first,
    last_name = v_last,
    company_name = v_company,
    onboarding_completed = true;

  insert into public.agent_settings (user_id)
  values (v_id)
  on conflict (user_id) do nothing;
end $$;

select
  u.id,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  u.encrypted_password is not null as has_password,
  i.provider,
  i.provider_id,
  p.role,
  p.company_name
from auth.users u
left join auth.identities i on i.user_id = u.id
left join public.profiles p on p.id = u.id
where lower(u.email) = 'chadsautara@gmail.com';
