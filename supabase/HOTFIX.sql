-- ============================================================================
-- HOTFIX for "too many redirects" loop after login.
-- Safe to run on an existing database. Idempotent.
--
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- ============================================================================

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = p_user_id),
    false
  );
$$;

create or replace function public.shares_site_with(p_other_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.site_members sm1
    join public.site_members sm2 on sm1.site_id = sm2.site_id
    where sm1.user_id = auth.uid()
      and sm2.user_id = p_other_user
  );
$$;

grant execute on function public.is_platform_admin(uuid) to anon, authenticated;
grant execute on function public.shares_site_with(uuid)  to anon, authenticated;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_platform_admin()
    or public.shares_site_with(id)
  );

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

create or replace function public.is_member(p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.site_members
    where site_id = p_site_id and user_id = auth.uid()
  ) or public.is_platform_admin();
$$;

create or replace function public.has_site_role(p_site_id uuid, p_min_role site_role)
returns boolean language sql stable security definer set search_path = public as $$
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
