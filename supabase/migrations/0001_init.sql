-- ============================================================================
-- Studio: multi-tenant headless CMS schema
-- ============================================================================
-- Tenants (sites) and per-user membership are the foundation. Every content
-- table carries site_id and is gated by RLS via membership.
-- ----------------------------------------------------------------------------

set check_function_bodies = off;

-- ---------- Extensions ------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------- Enums -----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'site_role') then
    create type site_role as enum ('owner', 'admin', 'editor', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'scheduled', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type submission_status as enum ('new', 'in_progress', 'contacted', 'closed', 'spam');
  end if;
end$$;

-- ---------- Helper: updated_at trigger --------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end$$;

-- ---------- sites -----------------------------------------------------------
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  primary_domain text,
  brand jsonb not null default '{}'::jsonb,
  amplify_webhook_url text,
  build_debounce_seconds int not null default 30,
  enabled_content_types text[] not null default '{blog_posts,case_studies,testimonials,faqs,pages}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sites_updated_at before update on public.sites
  for each row execute function public.set_updated_at();

-- ---------- profiles (one row per auth user) --------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a new auth user appears
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- site_members ----------------------------------------------------
create table if not exists public.site_members (
  user_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  role site_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (user_id, site_id)
);
create index if not exists site_members_site_idx on public.site_members(site_id);

-- ---------- invitations -----------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  site_id uuid not null references public.sites(id) on delete cascade,
  role site_role not null default 'editor',
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  unique (email, site_id)
);

-- ---------- authors ---------------------------------------------------------
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  slug text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create trigger authors_updated_at before update on public.authors
  for each row execute function public.set_updated_at();

-- ---------- media -----------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  mime_type text,
  file_size_bytes bigint,
  width int,
  height int,
  alt text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists media_site_idx on public.media(site_id, created_at desc);

-- ---------- blog_posts ------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  excerpt text,
  body_html text not null default '',
  cover_url text,
  cover_alt text,
  author_id uuid references public.authors(id) on delete set null,
  category text,
  tags text[] not null default '{}',
  read_minutes int,
  status content_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  seo jsonb not null default '{}'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create index if not exists blog_posts_site_status_idx on public.blog_posts(site_id, status, published_at desc);
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ---------- case_studies ----------------------------------------------------
create table if not exists public.case_studies (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  client text,
  industry text,
  category text,
  snippet text,
  image_url text,
  metrics jsonb not null default '[]'::jsonb,
  chart jsonb not null default '[]'::jsonb,
  challenge text,
  solution text,
  outcomes jsonb not null default '[]'::jsonb,
  stack text[] not null default '{}',
  status content_status not null default 'draft',
  published_at timestamptz,
  seo jsonb not null default '{}'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create index if not exists case_studies_site_status_idx on public.case_studies(site_id, status, published_at desc);
create trigger case_studies_updated_at before update on public.case_studies
  for each row execute function public.set_updated_at();

-- ---------- testimonials ----------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  author_name text not null,
  author_role text,
  quote text not null,
  avatar_url text,
  weight int not null default 0,
  is_published boolean not null default true,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists testimonials_site_idx on public.testimonials(site_id, weight desc);
create trigger testimonials_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ---------- faqs ------------------------------------------------------------
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  question text not null,
  answer_html text not null,
  category text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists faqs_site_idx on public.faqs(site_id, category, sort_order);
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- ---------- pages (free-form key/value content blocks per site) -------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  body_html text,
  blocks jsonb not null default '[]'::jsonb,
  status content_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

-- ---------- form_submissions (Shopify-like inbox) ---------------------------
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  form_name text not null,
  payload jsonb not null,
  status submission_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  source_url text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists form_submissions_site_status_idx on public.form_submissions(site_id, status, created_at desc);
create trigger form_submissions_updated_at before update on public.form_submissions
  for each row execute function public.set_updated_at();

-- ---------- audit_log -------------------------------------------------------
create table if not exists public.audit_log (
  id bigserial primary key,
  site_id uuid references public.sites(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_site_idx on public.audit_log(site_id, created_at desc);

-- ---------- build_jobs (debounced publish webhook queue) --------------------
create table if not exists public.build_jobs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  trigger text not null,
  status text not null default 'queued',
  scheduled_for timestamptz not null default now(),
  dispatched_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists build_jobs_pending_idx on public.build_jobs(site_id, status, scheduled_for);

-- ============================================================================
-- Per-site dedicated tables (only where shape really diverges)
-- ============================================================================

-- Kingsbridge: immigration_pathways
create table if not exists public.immigration_pathways (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  category text,
  summary text,
  body_html text,
  eligibility jsonb not null default '[]'::jsonb,
  process_steps jsonb not null default '[]'::jsonb,
  fees jsonb not null default '{}'::jsonb,
  processing_time text,
  cover_url text,
  status content_status not null default 'draft',
  sort_order int not null default 0,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
create trigger immigration_pathways_updated_at before update on public.immigration_pathways
  for each row execute function public.set_updated_at();

-- Kingsbridge: pricing_tiers
create table if not exists public.pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  price text,
  period text,
  description text,
  features jsonb not null default '[]'::jsonb,
  cta_label text,
  cta_url text,
  highlight boolean not null default false,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pricing_tiers_updated_at before update on public.pricing_tiers
  for each row execute function public.set_updated_at();

-- SearchHub: bulk_tiers
create table if not exists public.bulk_tiers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  tier_name text not null,
  link_count int,
  price_per_link text,
  total_price text,
  description text,
  features jsonb not null default '[]'::jsonb,
  highlight boolean not null default false,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bulk_tiers_updated_at before update on public.bulk_tiers
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Helper: is the current user a member (any role) of this site?
create or replace function public.is_member(p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.site_members
    where site_id = p_site_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.profiles where id = auth.uid() and is_platform_admin = true
  );
$$;

-- Helper: does the current user have at least the given role on this site?
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
    (select true from public.profiles where id = auth.uid() and is_platform_admin = true)
  );
$$;

-- Enable RLS
alter table public.sites            enable row level security;
alter table public.profiles         enable row level security;
alter table public.site_members     enable row level security;
alter table public.invitations      enable row level security;
alter table public.authors          enable row level security;
alter table public.media            enable row level security;
alter table public.blog_posts       enable row level security;
alter table public.case_studies     enable row level security;
alter table public.testimonials     enable row level security;
alter table public.faqs             enable row level security;
alter table public.pages            enable row level security;
alter table public.form_submissions enable row level security;
alter table public.audit_log        enable row level security;
alter table public.build_jobs       enable row level security;
alter table public.immigration_pathways enable row level security;
alter table public.pricing_tiers    enable row level security;
alter table public.bulk_tiers       enable row level security;

-- profiles: a user can read all profiles they share a site with + themselves
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (
    id = auth.uid()
    or exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.is_platform_admin)
    or exists (
      select 1 from public.site_members sm1
      join public.site_members sm2 on sm1.site_id = sm2.site_id
      where sm1.user_id = auth.uid() and sm2.user_id = profiles.id
    )
  );

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- sites: visible to members, mutable by owners + platform admins
drop policy if exists "sites_member_read" on public.sites;
create policy "sites_member_read" on public.sites
  for select using (public.is_member(id));

drop policy if exists "sites_owner_write" on public.sites;
create policy "sites_owner_write" on public.sites
  for all using (public.has_site_role(id, 'owner'))
  with check (public.has_site_role(id, 'owner'));

-- site_members: members can see fellow members; admins+ can mutate
drop policy if exists "site_members_member_read" on public.site_members;
create policy "site_members_member_read" on public.site_members
  for select using (public.is_member(site_id));

drop policy if exists "site_members_admin_write" on public.site_members;
create policy "site_members_admin_write" on public.site_members
  for all using (public.has_site_role(site_id, 'admin'))
  with check (public.has_site_role(site_id, 'admin'));

-- invitations: admins+ manage
drop policy if exists "invitations_admin" on public.invitations;
create policy "invitations_admin" on public.invitations
  for all using (public.has_site_role(site_id, 'admin'))
  with check (public.has_site_role(site_id, 'admin'));

-- A single macro: shared content tables read=member, write=editor+
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'authors','media','blog_posts','case_studies','testimonials',
      'faqs','pages','form_submissions','audit_log','build_jobs',
      'immigration_pathways','pricing_tiers','bulk_tiers'
    ])
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (public.is_member(site_id))', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$s', t);
    execute format('create policy "%1$s_write" on public.%1$s for all using (public.has_site_role(site_id, ''editor'')) with check (public.has_site_role(site_id, ''editor''))', t);
  end loop;
end$$;

-- ============================================================================
-- Build job dispatcher: when content rows change, enqueue a debounced job
-- ============================================================================
create or replace function public.enqueue_build_job()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_site uuid;
  v_debounce int;
begin
  v_site := coalesce(new.site_id, old.site_id);
  select build_debounce_seconds into v_debounce from public.sites where id = v_site;
  v_debounce := coalesce(v_debounce, 30);

  -- Only enqueue when status moves to/from published, OR a published row is edited
  if (tg_op = 'INSERT' and new.status = 'published')
     or (tg_op = 'UPDATE' and (old.status is distinct from new.status or new.status = 'published'))
     or (tg_op = 'DELETE' and old.status = 'published') then
    insert into public.build_jobs (site_id, trigger, scheduled_for)
    values (v_site, tg_table_name || ':' || tg_op, now() + (v_debounce || ' seconds')::interval);
  end if;
  return coalesce(new, old);
end$$;

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
    execute format('create trigger %1$s_enqueue_build after insert or update or delete on public.%1$s for each row execute function public.enqueue_build_job()', t);
  end loop;
end$$;

-- ============================================================================
-- Storage bucket for media (created via SQL so migrations are reproducible)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf']
)
on conflict (id) do nothing;

-- Storage policy: members of a site can upload to <site_id>/* prefix
drop policy if exists "media_member_read" on storage.objects;
create policy "media_member_read" on storage.objects
  for select using (
    bucket_id = 'media'
    and (
      -- Public bucket so anonymous reads OK; keep an explicit policy for clarity
      true
    )
  );

drop policy if exists "media_member_write" on storage.objects;
create policy "media_member_write" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.site_members
      where user_id = auth.uid()
        and site_id::text = split_part(name, '/', 1)
    )
  );

drop policy if exists "media_member_delete" on storage.objects;
create policy "media_member_delete" on storage.objects
  for delete using (
    bucket_id = 'media'
    and exists (
      select 1 from public.site_members
      where user_id = auth.uid()
        and site_id::text = split_part(name, '/', 1)
    )
  );
