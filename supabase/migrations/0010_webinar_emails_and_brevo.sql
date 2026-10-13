-- ============================================================================
-- Webinar emails (Brevo) + per-site Brevo / webinar mail settings
-- ============================================================================

-- Per-site Brevo + webinar email config (dashboard Settings; env is fallback only)
alter table public.sites
  add column if not exists brevo_api_key text,
  add column if not exists brevo_smtp_login text,
  add column if not exists brevo_smtp_key text,
  add column if not exists brevo_from_email text,
  add column if not exists brevo_from_name text,
  add column if not exists brevo_leads_list_id text,
  add column if not exists brevo_registered_list_id text,
  add column if not exists webinar_date_label text,
  add column if not exists webinar_local_time_label text,
  add column if not exists webinar_timezone text,
  add column if not exists webinar_zoom_url text,
  add column if not exists webinar_zoom_meeting_id text,
  add column if not exists webinar_zoom_passcode text,
  add column if not exists webinar_unpaid_reminder_minutes int not null default 15;

comment on column public.sites.brevo_api_key is
  'Brevo REST API key (xkeysib-…). Preferred for transactional + contact sync.';
comment on column public.sites.brevo_smtp_key is
  'Optional Brevo SMTP key (xsmtpsib-…) if API key is unavailable.';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'webinar_email_status') then
    create type webinar_email_status as enum (
      'pending',
      'sending',
      'sent',
      'failed',
      'skipped'
    );
  end if;
end$$;

alter table public.webinar_registrations
  add column if not exists unpaid_reminder_status webinar_email_status not null default 'pending',
  add column if not exists unpaid_reminder_due_at timestamptz,
  add column if not exists unpaid_reminder_sent_at timestamptz,
  add column if not exists unpaid_reminder_error text,
  add column if not exists paid_confirmation_status webinar_email_status not null default 'pending',
  add column if not exists paid_confirmation_sent_at timestamptz,
  add column if not exists paid_confirmation_error text,
  add column if not exists brevo_contact_id text;

create index if not exists webinar_unpaid_reminder_due_idx
  on public.webinar_registrations (unpaid_reminder_due_at)
  where unpaid_reminder_status = 'pending' and payment_status = 'unpaid';

comment on column public.webinar_registrations.unpaid_reminder_status is
  'pending→send after due_at; skipped if paid first; sent/failed after attempt';
comment on column public.webinar_registrations.paid_confirmation_status is
  'pending until paid; then sent once (idempotent); failed if Brevo errors';
