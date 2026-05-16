# Studio — multi-site CMS

A single Next.js 15 control plane that drives content, contact-form
submissions, and team access for every site you operate
(Kingsbridge Immigration, SearchHub Digital, Vantage, and any future site).

- One **Supabase** project holds all data, multi-tenant by `site_id`.
- One **Studio app** (this repo) lets editors and admins manage each workspace.
- Each public site stays a fully static SSG build on AWS Amplify, fetched from
  Studio's public API at build time and rebuilt automatically when content
  changes.

> **First-time setup (you're here) → see [`docs/SETUP.md`](./docs/SETUP.md).**
> **For onboarding a new site → see [`docs/INTEGRATION.md`](./docs/INTEGRATION.md).**
> **For deployment to Vercel/AWS → see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).**

## Local setup

```bash
cd studio
cp .env.example .env.local        # fill in Supabase + secrets
npm install
npm run dev                       # http://localhost:3100
```

You'll need:

1. A Supabase project (free tier is fine).
2. Apply migrations via the SQL editor or the Supabase CLI:
   ```bash
   supabase db push   # or paste 0001_init.sql + 0002_seed_sites.sql in the editor
   ```
3. A first user — just sign up via `/login`. Migration `0003_bootstrap_admin.sql`
   automatically promotes the **first** signed-up account to platform admin
   and grants `owner` on every site. **Do this before sharing the URL with
   anyone else.**

4. Migrate existing legacy data into Supabase:
   ```bash
   npm run migrate:searchhub
   npm run migrate:kingsbridge
   npm run migrate:vantage
   ```

## Deployment

Each app is a separate AWS Amplify deployment. Add the same `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SITE_ID` env vars to each public site so the
`prefetch` step has what it needs at build time.

| App | Folder | Build command | Recommended domain |
| --- | --- | --- | --- |
| Studio | `studio/` | `next build` | `admin.<yourdomain>` |
| SearchHub | `SearchHub_digital-/` | `npm run build` (= prefetch + vite build) | `searchhub.digital` |
| Kingsbridge | `kingsbridgeImmigration/` | `npm run build` (= prefetch + vite build) | `kingsbridgeimmigration.ca` |
| Vantage | `vantage/` | `npm run build` (= prefetch + astro build) | TBD |

## How content flows

```
Editor (Studio) ──▶ Supabase ──▶ Postgres trigger queues build_job
                                            │
                                            ▼
                              Edge Function: dispatch-builds (cron 1m)
                                            │
                                            ▼
                              Amplify webhook → site rebuilds
                                            │
                                            ▼
                              CloudFront serves new static HTML
```

`scripts/fetch-content.ts` in each site reads the latest published rows from
Supabase, writes them to typed `*.generated.ts` files, and the rest of the
build proceeds exactly as before. No runtime DB hits, SEO is preserved, and
the same legacy data is used as a fallback when env vars aren't set
(so local dev never breaks).

## Edge Functions

Deploy with the Supabase CLI:

```bash
supabase functions deploy submit-form          # public form submission endpoint
supabase functions deploy dispatch-builds      # cron, dispatches build webhooks
supabase functions deploy publish-scheduled    # cron, flips scheduled→published
supabase functions schedule create dispatch-builds --schedule '* * * * *'
supabase functions schedule create publish-scheduled --schedule '* * * * *'
```

Required function secrets:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=0x... \
                     RESEND_API_KEY=re_... \
                     RESEND_FROM_EMAIL='Studio <noreply@yourdomain.com>' \
                     NOTIFY_SEARCHHUB='owais@searchhub.digital' \
                     NOTIFY_KINGSBRIDGE='shabbir@kingsbridgeimmigration.ca' \
                     ALLOWED_ORIGINS='https://searchhub.digital,https://kingsbridgeimmigration.ca'
```

## Wiring a site to publish webhooks

1. AWS Amplify Console → App → App settings → Build settings → Incoming
   webhooks → Create webhook. Copy the URL.
2. In Studio go to the site's workspace → Settings → paste into
   "Amplify webhook URL", or update directly in SQL:
   ```sql
   update public.sites
   set amplify_webhook_url = 'https://webhooks.amplify…'
   where slug = 'searchhub';
   ```
3. Publish a post in Studio. `dispatch-builds` will fire the webhook within
   ~30 seconds (debounce window).

## Project layout

```
studio/
  src/
    app/
      login/                 # email + password + magic link
      forgot-password/
      auth/callback/         # PKCE + magic-link return
      auth/sign-out/
      account/               # 2FA enrollment
      workspaces/            # site picker
      [siteSlug]/            # workspace shell
        page.tsx             # dashboard
        blog/                # blog CRUD with TipTap
        case-studies/        # case study CRUD
        forms/               # submission inbox (Shopify-like)
        people/              # team & invites with role mgmt
        settings/            # branding + webhooks
        media/               # uploaded images
    components/
      layout/   ui/   editor/
    lib/
      supabase/              # server, client, middleware, types
      schemas/               # per-site content type registries
      auth.ts                # session + RBAC helpers
      audit.ts               # audit_log writer
      media-upload.ts        # browser-side storage upload
      utils.ts
    middleware.ts            # session refresh + route gating
  supabase/
    migrations/              # SQL schema (single source of truth)
    functions/
      submit-form/           # public form ingestion (Turnstile)
      dispatch-builds/       # cron: flush queued site rebuilds
      publish-scheduled/     # cron: scheduled→published
  scripts/
    migrate-searchhub.ts     # one-off importer
    migrate-kingsbridge.ts   # one-off importer
    migrate-vantage.ts       # one-off importer
```

## What ships in which phase (all complete)

| Phase | Status | What landed |
|---|---|---|
| 0 | ✓ | Supabase schema + RLS, profiles auto-create, auth, workspace switcher, dashboard shell |
| 1 | ✓ | Blog & case-study CRUD with TipTap, media upload, SearchHub migration & build wiring |
| 2 | ✓ | Kingsbridge schemas + migration + build wiring |
| 3 | ✓ | Submission inbox (filters, status, CSV export, assignee), user invites + roles, audit log, Turnstile-protected form endpoint |
| 4 | ✓ | Vantage onboarding (Astro prebuild) |
| 5 | ✓ | Scheduled publishing, draft preview routes, per-site whitelabel branding, TOTP 2FA, dark mode |

## Future enhancements (out of scope)

- Plausible / Umami analytics widget per workspace.
- Drag-and-drop media library with bulk operations.
- Visual page builder (block-based) replacing the JSON editor for `pages`.
- Per-tenant custom domains for the Studio app
  (`cms.kingsbridgeimmigration.ca`, etc.) — the multi-tenant DB and
  middleware can already support this; just CNAME and add Host-based
  workspace auto-selection.
