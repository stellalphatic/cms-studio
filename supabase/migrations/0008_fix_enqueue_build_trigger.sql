-- ============================================================================
-- 0008_fix_enqueue_build_trigger
--
-- BUG FIX
-- -------
-- The previous build-job trigger blindly read `new.status` for every table it
-- was attached to. But `authors`, `testimonials`, `faqs`, `pricing_tiers`, and
-- `bulk_tiers` don't have a `status` column — those use `is_published` instead,
-- and `authors` has neither. Result: every insert/update on those tables (and
-- thus every save of a blog post that creates a new author row) failed with
--    ERROR: record "new" has no field "status"
-- which Next.js surfaces as the generic "Server Components render error".
--
-- FIX
-- ---
-- Inspect the row through `row_to_json(...)` so the function can run against
-- ANY row shape, picking the right "is this published?" signal per table:
--   • status column   → blog_posts, case_studies, pages, immigration_pathways,
--                       services
--   • is_published    → testimonials, faqs, pricing_tiers, bulk_tiers
--   • neither (just author/media metadata changes) → always enqueue.
-- We still debounce + cap so a burst of saves only triggers one rebuild.
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
  -- Pull site_id off whichever record exists.
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
    -- authors / media / fallback: minor metadata, enqueue but rare.
    v_should := true;
  end if;

  if v_should then
    insert into public.build_jobs (site_id, trigger, scheduled_for)
    values (v_site, tg_table_name || ':' || tg_op, now() + (v_debounce || ' seconds')::interval);
  end if;

  return coalesce(new, old);
end$$;

-- Re-attach the trigger to every content table that uses it. Safe to run
-- multiple times.
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
