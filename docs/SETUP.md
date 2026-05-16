# Studio — full setup playbook

Follow this top to bottom the first time. After that, `INTEGRATION.md` covers
adding new sites and `DEPLOYMENT.md` covers redeploys.

> **Time required: ~45 minutes the first time.**
> **Prerequisites:** GitHub account, Supabase project (free tier OK), Vercel
> account (free Hobby tier OK), AWS Amplify access (you already have this).

---

## 0. Inventory — what we're standing up

| Component | Where it runs | Cost |
|---|---|---|
| Supabase (Postgres + Auth + Storage + Edge Functions) | supabase.com | Free → $25/mo |
| Studio (Next.js CMS) | Vercel | Free Hobby |
| Public sites (SearchHub, Kingsbridge, Vantage, Clona) | AWS Amplify | as today |
| Resend (transactional email) | resend.com | Free 3 000/mo |
| Cloudflare Turnstile (spam protection) | Cloudflare | Free, unlimited |

---

## 1. Apply the database schema (no CLI required)

You don't need the Supabase CLI. Use the dashboard.

1. Open your project at `https://supabase.com/dashboard/project/<id>`.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `studio/supabase/MIGRATE_ALL.sql` from this repo. Copy the entire
   contents. Paste into the SQL editor. Click **Run**.
   - The script is **idempotent** — safe to run again.
   - It creates every table, RLS policy, trigger, enum, and seeds the four
     sites: `searchhub`, `kingsbridge`, `vantage`, `clona`.
4. After it succeeds, open **Database → Tables** and confirm you see
   `sites`, `profiles`, `blog_posts`, `services`, `api_keys`, etc.

**Verify the seed:**
```sql
select slug, name, primary_domain from public.sites order by slug;
```
You should see four rows.

> **What if I add another migration later?**
> Just paste the new file in the same editor. Migration `0003` already
> includes the bootstrap admin trigger so the first user becomes super-admin.

---

## 2. Set Resend (free) — for invitation + form emails

1. Go to https://resend.com → sign up (free, 3 000 emails/month).
2. **Domains** → add the domain you'll send from (e.g. `yourdomain.com`).
   Add the DNS TXT/MX records they show you (one-time).
3. **API Keys** → create one named `studio-platform`. Copy the `re_…` key.
4. Save it as `RESEND_API_KEY` in Vercel later (step 6).
5. The platform default sender goes in `RESEND_FROM_EMAIL`, e.g.
   `Studio <noreply@yourdomain.com>`.

> **Per-site overrides:** Each site can later add its own Resend key in
> Studio → Settings. So Kingsbridge's contact-form emails come from
> `notify@kingsbridgeimmigration.ca`, SearchHub's from `info@searchhub.digital`,
> etc. The platform key is just the fallback.

---

## 3. Set Cloudflare Turnstile (free, optional but recommended)

**Is it necessary?** No — forms work without it. **Should you use it?** Yes —
it stops 99% of bot spam, is invisible to humans, and free with no quota.

1. https://dash.cloudflare.com → **Turnstile** (left nav).
2. **Add site** → name it `studio-platform`, mode `Managed`, add hostnames:
   `searchhub.digital`, `kingsbridgeimmigration.ca`, `clona.my`,
   `vantageprinters.com`, plus localhost for dev.
3. Copy the **Site Key** (public, starts with `0x4…`) and **Secret Key**
   (server-side).
4. Save the **Secret Key** as `TURNSTILE_SECRET_KEY` in Vercel.
5. Each public site uses the **Site Key** as `VITE_TURNSTILE_SITE_KEY` (or
   `PUBLIC_TURNSTILE_SITE_KEY` for Astro). The widget code is already wired
   into each site's contact form scaffold — just set the env var.

> **Will all sites use it automatically?** Once you set the env var on each
> site's Amplify environment, yes. The contact-form components check
> `VITE_TURNSTILE_SITE_KEY` and render the widget if present, skip if absent.
> One Turnstile site can cover all your hostnames.

---

## 4. Push the studio app to GitHub

```bash
cd C:\Users\User\Desktop\clona-searchhub\studio

# Initialise repo (if not already)
git init
git branch -M main
git add .
git commit -m "feat: initial studio CMS"

# Create the repo on GitHub (one of the two below)

# A) With GitHub CLI:
gh repo create my-org/studio --private --source=. --remote=origin --push

# B) Manually: create an empty repo at github.com, then:
git remote add origin git@github.com:my-org/studio.git
git push -u origin main
```

> Each public site (kingsbridge / searchhub / vantage / clona) keeps its own
> separate repo as today. Only **studio/** is the new one.

---

## 5. Deploy Studio on Vercel

1. https://vercel.com → **Add New… → Project** → import the repo from step 4.
2. **Framework preset**: Next.js (auto-detected).
3. **Root directory**: leave as `./` (the repo root *is* studio).
   - If you imported the monorepo (clona-searchhub) instead of just studio,
     set Root Directory to `studio`.
4. **Environment Variables** — copy each value from your `studio/.env`:

   | Name | Value source | Server / Public |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → URL | Public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon (public) key | Public |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role key | Server |
   | `NEXT_PUBLIC_APP_URL` | `https://admin.yourdomain.com` (set in step 7) | Public |
   | `RESEND_API_KEY` | step 2 | Server |
   | `RESEND_FROM_EMAIL` | `Studio <noreply@yourdomain.com>` | Server |
   | `TURNSTILE_SECRET_KEY` | step 3 | Server |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | step 3 | Public |
   | `PREVIEW_JWT_SECRET` | `openssl rand -base64 32` (any 32-char random) | Server |
   | `ALLOWED_ORIGINS` | `https://searchhub.digital,https://kingsbridgeimmigration.ca,https://clona.my,https://vantageprinters.com` | Server |
   | `DATABASE_URL` / `DIRECT_URL` | Only needed if you run migration scripts locally | Server |

5. Click **Deploy**. First deploy takes ~2 minutes.
6. Vercel gives you a `*.vercel.app` URL. Open it.

---

## 6. Become the first super-admin

1. Open the Vercel URL → **Sign up** with your real email.
2. The migration trigger from `0003_bootstrap_admin.sql` automatically:
   - Marks you as `is_platform_admin = true`
   - Grants you `owner` on all four sites (searchhub, kingsbridge, vantage, clona)
3. After signing up, you'll see four workspace cards. Top-right also shows a
   **Platform admin** button that lands you at `/admin` — your super-admin view.

> **Verify in SQL** if you want:
> ```sql
> select email, is_platform_admin from public.profiles;
> ```

> **CRITICAL:** Don't share the Vercel URL until you've done this signup.
> Otherwise whoever signs up first will become super-admin.

---

## 7. Custom domain for the CMS

1. Pick a domain (recommend `admin.yourdomain.com` for the master portal).
2. Vercel → Project → **Settings → Domains** → add `admin.yourdomain.com`.
3. At your DNS host (Cloudflare for Kingsbridge, Route 53 for SearchHub, etc.):
   add a `CNAME` record pointing to `cname.vercel-dns.com`.
4. SSL is automatic (Let's Encrypt via Vercel). Wait ~1 minute, then visit
   `https://admin.yourdomain.com`. Update `NEXT_PUBLIC_APP_URL` in Vercel to
   match and redeploy.

> **Per-client whitelabel domain (optional):** Each client can also CNAME
> their own subdomain (e.g. `cms.kingsbridgeimmigration.ca`) to the same
> Vercel project. Add it as a Vercel domain, then set `cms_domain` in
> Studio → Settings for that workspace. The middleware auto-routes by Host.

---

## 8. Deploy the Edge Functions (forms + builds + scheduled publish)

The CLI is not strictly required, but **for Edge Functions you do need it**
because they're server-side TypeScript files. Two options:

### A) Install the CLI (5 minutes, recommended)

```powershell
# Windows / Scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR npm global:
npm install -g supabase

# Verify
supabase --version
```

Then:

```powershell
cd C:\Users\User\Desktop\clona-searchhub\studio
supabase login                 # opens browser
supabase link --project-ref <project-ref>   # the YYYYY in YYYYY.supabase.co

supabase functions deploy submit-form
supabase functions deploy dispatch-builds
supabase functions deploy publish-scheduled

# Set environment variables consumed by the functions
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL="Studio <noreply@yourdomain.com>"
supabase secrets set TURNSTILE_SECRET_KEY=0x...
supabase secrets set ALLOWED_ORIGINS="https://searchhub.digital,https://kingsbridgeimmigration.ca,https://clona.my,https://vantageprinters.com"

# Schedule the publish-scheduled cron (every 5 minutes)
supabase functions schedule create publish-scheduled --cron "*/5 * * * *"
```

### B) Manual upload via dashboard

In Supabase → **Edge Functions** → **Create function** → name it
`submit-form` → paste the contents of `studio/supabase/functions/submit-form/index.ts`.
Repeat for `dispatch-builds` and `publish-scheduled`. Set secrets in
**Project Settings → Edge Functions → Secrets**.

> **Note the function URL** for `submit-form`. It looks like
> `https://YOUR-PROJECT.functions.supabase.co/submit-form`. You'll need it
> in step 9.

---

## 9. Wire each public site to the CMS

For each of the four sites, add these env vars **in AWS Amplify**:

**Amplify Console → App → App settings → Environment variables → Add:**

| Variable | Value |
|---|---|
| `CMS_URL` | `https://admin.yourdomain.com` (your Studio URL) |
| `CMS_API_KEY` | Generate one in Studio → workspace → API Keys (step 10) |
| `VITE_FORMS_URL` (Vite sites) | `https://YOUR-PROJECT.functions.supabase.co/submit-form` |
| `PUBLIC_FORMS_URL` (Vantage/Astro) | same as above |
| `VITE_TURNSTILE_SITE_KEY` (or `PUBLIC_TURNSTILE_SITE_KEY` for Astro) | from step 3 |

For the **Vite/React sites** (SearchHub, Kingsbridge, Clona) you also need
the build-time fetcher to talk to Supabase directly:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | from step 5 |
| `SUPABASE_ANON_KEY` | from step 5 |

(Kingsbridge and SearchHub already have `scripts/fetch-content.ts` wired —
the new `prefetch` step in their `package.json` runs it automatically before
`vite build`. Clona uses the public CMS API via `CMS_URL`+`CMS_API_KEY`.)

After saving the env vars, click **Redeploy this version** in Amplify so
the build picks them up.

---

## 10. Generate the per-site API keys

For each site (the public API is read-only and lets the static-site builders
pull content):

1. Visit `https://admin.yourdomain.com/<site-slug>/api-keys`
   (e.g. `/searchhub/api-keys`).
2. **Create key** → name it `amplify-build`, expiry 0 (no expiry).
3. **Copy the secret immediately** — you'll never see it again.
4. Paste it into AWS Amplify as `CMS_API_KEY` for that site.
5. Repeat for the other three sites.

---

## 11. Wire the build webhooks (auto-rebuild on publish)

For each site:

1. Amplify → App → App settings → **Build settings** → scroll to **Incoming
   webhooks** → **Create webhook** for branch `main`.
2. Copy the URL.
3. In Studio → workspace → **Settings → Build webhook** → paste, save.

Now: anytime an editor clicks **Publish** in Studio, the site rebuilds
within ~30 seconds (debounced so a flurry of publishes only triggers one
rebuild).

---

## 12. Migrate existing content into the CMS (one-time)

The repo already has migration scripts for SearchHub, Kingsbridge, and Vantage.
Run them once from your laptop:

```powershell
cd C:\Users\User\Desktop\clona-searchhub\studio
npm install

# These read DATABASE_URL/DIRECT_URL + SUPABASE_SERVICE_ROLE_KEY from .env
npx tsx scripts/migrate-searchhub.ts
npx tsx scripts/migrate-kingsbridge.ts
npx tsx scripts/migrate-vantage.ts
```

For Clona — the case-studies catalog is huge JSON. You can either:

- **Hand-migrate** the most important ones via the Studio UI (recommended;
  takes ~30 min and lets you tidy the content).
- **OR** I can write a `scripts/migrate-clona.ts` if you want — say the word
  and I'll add it.

Until migration runs, each site falls back to the legacy hardcoded data
(rename pattern `*.legacy.ts` you'll see in `src/data`/`src/content`).

---

## 13. Per-site email — give each owner their own inbox

For each site, in Studio → workspace → **Settings → Form notifications**:

- Resend API key (each client's own — they sign up at resend.com)
- From address (verified on **their** Resend, e.g. `notify@kingsbridgeimmigration.ca`)
- Notify emails (comma-separated recipients)

If left blank, the platform default (`RESEND_*` env in step 5) is used.

---

## 14. Day-to-day: how editors use it

- Sign in at `https://admin.yourdomain.com` (or `cms.<client>.com`).
- Pick a workspace from the switcher.
- Write content → click **Save draft** → preview → **Publish** →
  webhook fires → site rebuilds.
- See contact-form submissions under **Submissions** in the sidebar
  (Shopify-style inbox with status, assignment, CSV export).
- Admins manage team in **People**. Platform admins can add new sites or
  promote others to platform admin under `/admin`.

---

## 15. Common gotchas

| Symptom | Fix |
|---|---|
| `supabase: command not found` | Install the CLI (step 8A) or use the dashboard (step 8B). |
| Signup says "Email rate limit exceeded" | Supabase free-tier limit. Wait an hour or upgrade. |
| First user isn't super-admin | Migration `0003` didn't run. Re-paste `MIGRATE_ALL.sql`. |
| Site rebuilds aren't triggered | Check Build webhook URL in Settings; verify Amplify webhook is active. |
| Form submissions return 401 | Check Studio → API Keys exists for that site, and `CMS_API_KEY` env on the public site matches. |
| Form submissions don't email anyone | `RESEND_API_KEY` not set in Edge Functions secrets, OR site has no `notify_emails` configured. |
| Contact form CORS error | Add the site's origin to `ALLOWED_ORIGINS` (step 5/8) or to per-site Settings → CORS. |

---

## 16. What's where

| Path | Purpose |
|---|---|
| `studio/supabase/MIGRATE_ALL.sql` | Bundled schema — paste into Supabase SQL Editor |
| `studio/src/app/admin/` | Platform admin (super-admin) UI |
| `studio/src/app/[siteSlug]/` | Per-workspace content / forms / settings UI |
| `studio/src/app/api/v1/` | Public REST API consumed by client sites |
| `studio/packages/sdk/studio-cms.ts` | Drop-in TypeScript client for any site |
| `<each-site>/scripts/fetch-content.ts` | Build-time CMS fetcher |
| `<each-site>/src/data/cms.generated.ts` | Auto-generated typed content |
| `<each-site>/src/data/*.legacy.ts` | Original hardcoded content (fallback) |

---

## 17. Adding a future site (the 5-minute version)

1. Studio → `/admin/sites` → **Create site** with the slug.
2. Studio → that workspace → **API Keys** → create key.
3. In the new site's repo, copy `clona/src/lib/cms.ts` and
   `clona/scripts/fetch-content.ts` as templates (rename `site: "clona"` to
   the new slug).
4. Add CMS env vars in Amplify; redeploy.
5. Connect the build webhook back to Studio → Settings.

That's it. Same pattern works for any framework — Vite, Astro, Next, Remix,
Eleventy, Svelte, etc.
