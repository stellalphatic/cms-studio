# Deployment

## Studio (Next.js) → Vercel

**Why Vercel and not Amplify?** Vercel is built by the Next.js team. ISR,
edge middleware, image optimization, and the App Router work without
config. Amplify supports Next 15 but each release has a 1–3 month lag and
cold starts are 2–3× slower in our testing.

### One-time setup

1. Push the `studio/` folder to its own GitHub repo (or import the monorepo
   and set Vercel's "Root Directory" to `studio`).
2. Vercel → New Project → import the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `next build` (default).
5. Install command: `npm install`.
6. Environment Variables — copy every key from `studio/.env.example`. The
   only `NEXT_PUBLIC_*` ones go to the browser; everything else stays
   server-only.
7. Click Deploy.

### Domains

- Add `admin.yourdomain.com` as the primary.
- Add any whitelabel CMS subdomains (`cms.client.com`) here too — Vercel
  supports unlimited domains per project. Studio middleware automatically
  routes them to the right workspace (see `INTEGRATION.md` §6).

### First admin

The very first user to sign up at `admin.yourdomain.com/signup` is
auto-promoted to platform admin and granted `owner` on every site
(migration `0003_bootstrap_admin.sql`). **Sign yourself up before sharing
the URL with anyone.**

### Subsequent admins / interns

Studio → workspace → People → Invite. Pick a role (viewer, editor, admin).
The invite is emailed via Resend; new user signs up and is auto-added to
that workspace at that role.

## Public sites → AWS Amplify

Already deployed. The only changes when wiring up the CMS:

1. Add `CMS_URL` and `CMS_API_KEY` to the Amplify environment variables.
2. Create an Amplify build webhook for `main`, paste it into Studio →
   Settings.
3. (Optional, for SearchHub-style sites) confirm `prefetch` runs before the
   build — see `package.json` build scripts.

## Supabase

1. Create the project at supabase.com.
2. Run the migrations in `studio/supabase/migrations/` in numerical order
   (the dashboard's SQL editor or `supabase db push`).
3. Run the seed `0002_seed_sites.sql` once for the three current sites.
4. Deploy the Edge Functions:
   ```bash
   supabase functions deploy submit-form
   supabase functions deploy dispatch-builds
   supabase functions deploy publish-scheduled
   ```
5. Schedule the cron for `publish-scheduled`:
   ```bash
   supabase functions schedule create publish-scheduled --cron "*/5 * * * *"
   ```

## Migrations as you grow

When you add a new site that needs a unique table (like Kingsbridge's
`immigration_pathways`):

1. New migration file in `studio/supabase/migrations/000X_<name>.sql`.
2. Add the table + RLS + a sidebar entry in `src/lib/schemas/<site>.ts`.
3. Add a route handler under `src/app/api/v1/sites/[siteSlug]/<resource>/`.
4. Run the migration on Supabase, redeploy Studio.

That's the entire onboarding loop for novel content shapes.

## Kingsbridge webinar ($1 seat) + Stripe

1. Run `supabase/migrations/0009_webinar_registrations.sql` on Supabase.
2. Set Studio env vars:
   - `WEBINAR_STRIPE_PAYMENT_LINK=https://buy.stripe.com/4gMdR9fu1a1XfrN6vB3Je09`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe Dashboard)
3. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://<cms-host>/api/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `charge.refunded`
4. Redeploy Studio. Public site Reserve → unpaid row → redirect to Payment
   Link with `client_reference_id` → webhook marks paid.
5. CMS → Kingsbridge → **Webinar** inbox (also visible under Submissions
   filtered to `webinar_registration`).

## Kingsbridge Meta (Lead browser + Purchase CAPI)

Pixel `1000856715673214` stays on the public site only (do not reinstall).

- **Lead** — browser Pixel, only after CMS `submit-form` returns 2xx (not on button click).
- **Purchase** — CMS Conversions API when Stripe marks a webinar seat paid.

Studio env (Purchase CAPI):

- `META_PIXEL_ID=1000856715673214`
- `META_CAPI_ACCESS_TOKEN=...` (Events Manager → Pixel → Settings → Generate access token)
- Optional QA: `META_TEST_EVENT_CODE=TESTxxxx` then remove after Test Events pass

Public site QA: open `/?meta_test_code=TESTxxxx` or set `VITE_META_TEST_EVENT_CODE` and redeploy, then remove.

Smoke: `npx tsx scripts/test-meta-capi.ts` · `npx tsx scripts/test-stripe-paid-capi.ts`

## Kingsbridge webinar emails (Brevo)

1. Run `0010_webinar_emails_and_brevo.sql` on Supabase.
2. Prefer **CMS → Kingsbridge → Settings → Brevo** (per-site keys), not only root env:
   - `brevo_api_key` (**required**, `xkeysib-…` from Brevo → Settings → API Keys)
   - From email/name (domain must be verified in Brevo)
   - Optional Leads / Registered list IDs
   - Webinar date, Zoom URL/ID/passcode, unpaid reminder minutes (default 15)
3. Platform fallbacks (optional): `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `CRON_SECRET`, etc. See `.env.example`.
4. Vercel Cron hits `/api/v1/cron/webinar-emails` every minute (set `CRON_SECRET`).
5. Flow: unpaid lead → schedule reminder → after N minutes if still unpaid → payment email; Stripe paid → Zoom confirmation once. Email status columns show sent/failed/skipped.
