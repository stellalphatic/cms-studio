-- ============================================================================
-- Add Clona (AI automation services site) as a tenant. Service categories
-- and packages live in flexible jsonb under custom_fields on case_studies +
-- a dedicated `services` table created here.
-- ============================================================================

insert into public.sites (id, slug, name, primary_domain, brand, enabled_content_types)
values (
  '44444444-4444-4444-4444-444444444444',
  'clona',
  'Clona',
  'clona.my',
  jsonb_build_object(
    'logo', '/brands/clona.svg',
    'primary', '#6366f1',
    'accent', '#06b6d4',
    'tagline', 'AI automation that actually ships.'
  ),
  array['blog_posts','case_studies','testimonials','faqs','services']
)
on conflict (slug) do update set
  name = excluded.name,
  primary_domain = excluded.primary_domain,
  brand = excluded.brand,
  enabled_content_types = excluded.enabled_content_types;

-- ---------- services (Clona-specific service catalog) ----------------------
-- Each row is a "Service category" with packages stored as jsonb.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  slug text not null,
  title text not null,
  problem_line text,
  description text,
  accent text,                                           -- indigo|cyan|purple|emerald|rose
  packages jsonb not null default '[]'::jsonb,           -- array of { id, name, description, solutions[] }
  status content_status not null default 'draft',
  sort_order int not null default 0,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (site_id, slug)
);
create index if not exists services_site_status_idx on public.services(site_id, status);

drop trigger if exists trg_services_updated on public.services;
create trigger trg_services_updated before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists trg_services_build on public.services;
create trigger trg_services_build after insert or update or delete on public.services
  for each row execute function public.enqueue_build_job();

alter table public.services enable row level security;

drop policy if exists "services_read" on public.services;
create policy "services_read" on public.services
  for select using (public.is_member(site_id));

drop policy if exists "services_write" on public.services;
create policy "services_write" on public.services
  for all using (public.has_site_role(site_id, 'editor'))
  with check (public.has_site_role(site_id, 'editor'));
