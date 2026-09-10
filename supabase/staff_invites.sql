-- Staff invites. Run in the Supabase SQL editor.
-- Pending invites become admin when that email creates an Atelier account.

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin' check (role in ('admin')),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invited_by uuid references public.profiles (id) on delete set null,
  invited_at timestamptz default now(),
  accepted_at timestamptz
);

alter table public.staff_invites enable row level security;
