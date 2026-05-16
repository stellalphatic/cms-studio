-- ============================================================================
-- Per-site email config + whitelabel CMS domains + public-API allow-list.
-- ============================================================================

-- Per-site notification + sender config. NULL columns fall back to the
-- platform-level RESEND_* env vars on the Edge Function.
alter table public.sites
  add column if not exists resend_api_key text,
  add column if not exists resend_from_email text,
  add column if not exists notify_emails text[] not null default '{}',
  -- Optional custom CMS domain (e.g. cms.kingsbridgeimmigration.ca).
  -- When this host hits the Studio app, middleware auto-pins the workspace.
  add column if not exists cms_domain text,
  -- Allowed Origins for the public read API + submit-form endpoint.
  -- If empty, the platform-level ALLOWED_ORIGINS env var is used.
  add column if not exists allowed_origins text[] not null default '{}';

create unique index if not exists sites_cms_domain_idx
  on public.sites (lower(cms_domain))
  where cms_domain is not null;
