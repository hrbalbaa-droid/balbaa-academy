-- ============================================================================
-- 0001_profiles.sql
-- Authentication profiles for the Balbaa Academy platform.
-- Run this first. The full course/lesson schema ships in Step 3.
-- ============================================================================

do $$
begin
  create type public.user_role as enum ('admin', 'student');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile for every Supabase Auth user.';

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------------------
-- New auth user -> profile (always a student by default)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      ''
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill any accounts created before this migration.
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    ''
  ),
  'student'
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Prevent a user from promoting themselves through the public API.
-- Role changes made from the Supabase SQL editor / service role still work.
-- ----------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    select role into actor_role from public.profiles where id = auth.uid();
    if actor_role is distinct from 'admin' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- ----------------------------------------------------------------------------
-- RLS policies: authenticated users can read names; users edit their own row.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- Promote the first academy administrator after creating the account:
--   update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
-- ----------------------------------------------------------------------------
