-- ============================================================================
-- Bootstrap: the very first signed-up user becomes the platform admin and
-- gets `owner` membership on every site. Subsequent signups land as plain
-- profiles with no site memberships (and must be invited from the People
-- admin).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_first boolean;
begin
  -- Insert/refresh the profile row.
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Is this the first profile ever? Promote them to platform admin and owner
  -- of every existing site. We check by counting profiles excluding self.
  select count(*) = 0 into v_is_first
  from public.profiles
  where id <> new.id;

  if v_is_first then
    update public.profiles set is_platform_admin = true where id = new.id;
    insert into public.site_members (user_id, site_id, role)
    select new.id, s.id, 'owner'
    from public.sites s
    on conflict (user_id, site_id) do update set role = 'owner';
  end if;

  -- If they were invited (invitations row exists for this email + site),
  -- consume those invites and create the memberships.
  insert into public.site_members (user_id, site_id, role)
  select new.id, i.site_id, i.role
  from public.invitations i
  where i.email = new.email
    and i.accepted_at is null
    and i.expires_at > now()
  on conflict (user_id, site_id) do update set role = excluded.role;

  update public.invitations
  set accepted_at = now()
  where email = new.email and accepted_at is null;

  return new;
end$$;

-- Recreate trigger so the updated function takes effect.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When a *new* site is added, also auto-grant the platform admin owner
-- access so they never lock themselves out.
create or replace function public.grant_admin_on_new_site()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_members (user_id, site_id, role)
  select p.id, new.id, 'owner'
  from public.profiles p
  where p.is_platform_admin = true
  on conflict (user_id, site_id) do nothing;
  return new;
end$$;

drop trigger if exists on_site_created on public.sites;
create trigger on_site_created
  after insert on public.sites
  for each row execute function public.grant_admin_on_new_site();
