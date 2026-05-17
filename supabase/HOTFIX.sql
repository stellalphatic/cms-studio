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

-- ============================================================================
-- BUG: "record \"new\" has no field \"status\""
--
-- The build-job trigger blindly read `new.status` on every table it's
-- attached to. authors / testimonials / faqs / pricing_tiers / bulk_tiers
-- don't have that column → every save into them (including creating a new
-- author while saving a blog post) raised an exception that Next.js then
-- surfaced as the opaque "Server Components render error".
--
-- Patch the function to inspect rows via row_to_json so it stops referencing
-- columns that don't exist on the triggering table.
-- ============================================================================

create or replace function public.enqueue_build_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site uuid;
  v_debounce int;
  v_should boolean := false;
  v_new_status text;
  v_old_status text;
  v_new_pub boolean;
  v_old_pub boolean;
begin
  v_site := coalesce(
    (case when tg_op <> 'DELETE' then (row_to_json(new)->>'site_id')::uuid end),
    (case when tg_op <> 'INSERT' then (row_to_json(old)->>'site_id')::uuid end)
  );
  if v_site is null then
    return coalesce(new, old);
  end if;

  select build_debounce_seconds into v_debounce from public.sites where id = v_site;
  v_debounce := coalesce(v_debounce, 30);

  if tg_table_name in ('blog_posts','case_studies','pages','immigration_pathways','services') then
    v_new_status := case when tg_op <> 'DELETE' then row_to_json(new)->>'status' end;
    v_old_status := case when tg_op <> 'INSERT' then row_to_json(old)->>'status' end;
    if (tg_op = 'INSERT' and v_new_status = 'published')
       or (tg_op = 'UPDATE' and (v_old_status is distinct from v_new_status or v_new_status = 'published'))
       or (tg_op = 'DELETE' and v_old_status = 'published') then
      v_should := true;
    end if;

  elsif tg_table_name in ('testimonials','faqs','pricing_tiers','bulk_tiers') then
    v_new_pub := case when tg_op <> 'DELETE' then (row_to_json(new)->>'is_published')::boolean end;
    v_old_pub := case when tg_op <> 'INSERT' then (row_to_json(old)->>'is_published')::boolean end;
    if (tg_op = 'INSERT' and v_new_pub)
       or (tg_op = 'UPDATE' and (v_old_pub is distinct from v_new_pub or coalesce(v_new_pub, false)))
       or (tg_op = 'DELETE' and v_old_pub) then
      v_should := true;
    end if;

  else
    -- authors / media / fallback: minor metadata changes always enqueue.
    v_should := true;
  end if;

  if v_should then
    insert into public.build_jobs (site_id, trigger, scheduled_for)
    values (v_site, tg_table_name || ':' || tg_op, now() + (v_debounce || ' seconds')::interval);
  end if;

  return coalesce(new, old);
end$$;

-- Re-attach the trigger to every content table that uses it (idempotent).
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'blog_posts','case_studies','testimonials','faqs','pages',
      'immigration_pathways','pricing_tiers','bulk_tiers','authors'
    ])
  loop
    execute format('drop trigger if exists %1$s_enqueue_build on public.%1$s', t);
    execute format(
      'create trigger %1$s_enqueue_build after insert or update or delete on public.%1$s for each row execute function public.enqueue_build_job()',
      t
    );
  end loop;
end$$;
