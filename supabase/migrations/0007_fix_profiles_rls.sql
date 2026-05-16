-- ============================================================================
-- HOTFIX: profiles RLS recursion bug
-- ============================================================================
-- The original 0001_init policy `profiles_self_read` had an inline
--   exists (select 1 from public.profiles p2 where p2.id = auth.uid() ...)
-- subquery against its OWN table. Postgres re-applies the same RLS policy
-- to that subquery → infinite recursion → query errors out → server
-- helpers think the user has no profile → redirect loop between / and /login.
--
-- Fix: wrap every cross-row read of profiles in SECURITY DEFINER helpers
-- (which bypass RLS), then rewrite the policy to use those helpers.
-- Same fix is applied to site_members for the same reason.
-- ============================================================================

-- ---------- 1. SECURITY DEFINER helpers (bypass RLS) ------------------------
create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = p_user_id),
    false
  );
$$;

create or replace function public.shares_site_with(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_members sm1
    join public.site_members sm2 on sm1.site_id = sm2.site_id
    where sm1.user_id = auth.uid()
      and sm2.user_id = p_other_user
  );
$$;

grant execute on function public.is_platform_admin(uuid) to anon, authenticated;
grant execute on function public.shares_site_with(uuid) to anon, authenticated;

-- ---------- 2. Rewrite the profiles policy ---------------------------------
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_platform_admin()
    or public.shares_site_with(id)
  );

-- Make sure platform admins can update other profiles (e.g. /admin/users
-- toggling is_platform_admin uses the service role today, but this lets
-- the UI work via the anon client too if we ever need it).
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- ---------- 3. Make is_member rely on the helper too ------------------------
-- The original is_member already inlined a profiles read. It worked because
-- is_member itself is SECURITY DEFINER, but reusing the new helper keeps
-- everything consistent.
create or replace function public.is_member(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_members
    where site_id = p_site_id and user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

create or replace function public.has_site_role(p_site_id uuid, p_min_role site_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with my as (
    select role from public.site_members
    where site_id = p_site_id and user_id = auth.uid()
  ),
  ranks(role, weight) as (
    values ('viewer'::site_role, 1), ('editor', 2), ('admin', 3), ('owner', 4)
  )
  select coalesce(
    (select true from my m
       join ranks mr on mr.role = m.role
       join ranks nr on nr.role = p_min_role
       where mr.weight >= nr.weight
       limit 1),
    public.is_platform_admin()
  );
$$;
