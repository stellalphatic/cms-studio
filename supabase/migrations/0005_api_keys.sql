-- ============================================================================
-- API keys: per-site, hashed, scoped read tokens that public sites use to
-- call /api/v1/sites/<slug>/...
--
-- Storage: token_hash (SHA-256 of the secret). The plaintext is shown once
-- when the key is created and never again — exactly like Stripe/GitHub.
-- Format of the plaintext: sk_<env>_<24 random base32 chars>
-- ============================================================================

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  prefix text not null,                              -- first 8 chars for UI display
  token_hash text not null unique,                   -- sha256(secret), hex
  scopes text[] not null default '{read}',
  created_by uuid references public.profiles(id) on delete set null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_site_idx on public.api_keys(site_id, revoked_at);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_read" on public.api_keys;
create policy "api_keys_read" on public.api_keys
  for select using (public.is_member(site_id));

drop policy if exists "api_keys_admin" on public.api_keys;
create policy "api_keys_admin" on public.api_keys
  for all using (public.has_site_role(site_id, 'admin'))
  with check (public.has_site_role(site_id, 'admin'));
