-- ============================================================================
-- Kingsbridge webinar registrations ($1 seat reservations)
-- Tracks unpaid → paid via Stripe Payment Link + webhook.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'webinar_payment_status') then
    create type webinar_payment_status as enum ('unpaid', 'paid', 'refunded');
  end if;
end$$;

create table if not exists public.webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  form_submission_id uuid references public.form_submissions(id) on delete set null,
  name text not null,
  email citext not null,
  whatsapp text not null,
  source text,
  landing_variant text,
  payment_status webinar_payment_status not null default 'unpaid',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_email text,
  amount_cents int,
  currency text default 'cad',
  paid_at timestamptz,
  source_url text,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webinar_registrations_site_status_idx
  on public.webinar_registrations(site_id, payment_status, created_at desc);
create index if not exists webinar_registrations_site_email_idx
  on public.webinar_registrations(site_id, email);
create index if not exists webinar_registrations_unpaid_email_idx
  on public.webinar_registrations(site_id, email)
  where payment_status = 'unpaid';

drop trigger if exists webinar_registrations_updated_at on public.webinar_registrations;
create trigger webinar_registrations_updated_at
  before update on public.webinar_registrations
  for each row execute function public.set_updated_at();

alter table public.webinar_registrations enable row level security;

drop policy if exists "webinar_registrations_read" on public.webinar_registrations;
create policy "webinar_registrations_read" on public.webinar_registrations
  for select using (public.is_member(site_id));

drop policy if exists "webinar_registrations_write" on public.webinar_registrations;
create policy "webinar_registrations_write" on public.webinar_registrations
  for all using (public.has_site_role(site_id, 'editor'))
  with check (public.has_site_role(site_id, 'editor'));

comment on table public.webinar_registrations is
  'Kingsbridge $1 webinar seat reservations. Created unpaid on form submit; marked paid by Stripe webhook.';
