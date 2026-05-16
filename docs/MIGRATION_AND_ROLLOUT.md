# Migration & rollout playbook

> A pragmatic answer to: *"Do I move every existing article into the
> database, or keep them static and only track new ones from now on?"*

**TL;DR.** Don't migrate everything on day one. Ship the CMS in **safe mode**
where each public site falls back to its current static data if the CMS env
vars are missing or empty. Migrate one content type at a time, starting with
the one your editors actually touch most often.

This document is the rollout plan for the four sites (SearchHub, Kingsbridge,
Vantage, Clona) and the template for any future site.

---

## 1. Three modes, in order

| Mode | Site behavior | When to use |
|---|---|---|
| **Static-only** | Today's behavior. No CMS env vars. Site builds from `*.legacy.ts`. | Day zero of integration. |
| **Hybrid** (recommended start) | Build script fetches CMS data. If empty / missing, falls back to legacy. New content goes through CMS; old content stays in legacy until you migrate it. | Week 1–4. |
| **CMS-only** | Legacy files removed. All content lives in Supabase. Build fails loudly if CMS is unreachable. | Once every site is comfortably operating. |

The repo already supports all three. The switch is environment variables, not
code edits. See "Switching modes" below.

---

## 2. Why hybrid is the right default

- **Zero risk of breaking live sites.** If the CMS is empty (or env vars are
  missing in CI), the build still succeeds with today's content.
- **No migration pressure.** You don't have to copy 40 case studies into the
  CMS the same week you turn it on.
- **New articles flow through CMS immediately.** Anything authored in Studio
  appears on the next build. The legacy file stays as a guarantee, not as a
  blocker.
- **Easy rollback.** If the CMS misbehaves on a Saturday morning, remove the
  env var, redeploy, and you're back on legacy in under five minutes.

The convention is already wired into Clona (`src/data/*Catalog.ts` re-export
from `*.legacy.ts` unless `cms.generated.ts` is non-null).

---

## 3. Site-by-site rollout plan

The order matches "least risk first." A site stays in static-only mode until
its row in the table flips to hybrid.

| # | Site | Mode now | Step to flip to hybrid | First content type to migrate |
|---|---|---|---|---|
| 1 | **Clona** | hybrid wired | Add `CMS_URL` + `CMS_API_KEY` in Amplify env → rebuild | Case studies (you have ~6) |
| 2 | **SearchHub** | static-only | Add a `scripts/fetch-content.ts` (copy from Clona) → add Amplify env | Blog posts |
| 3 | **Kingsbridge** | static-only | Same fetch script → add Amplify env | Pathways then FAQs |
| 4 | **Vantage** | static-only | Astro-specific fetch in `astro.config.mjs` or build prehook | Blog posts |

For each site, repeat the same five steps:

1. Issue an API key for that site in Studio → Settings → API keys.
2. Set `CMS_URL=https://cms.fousventures.com` and `CMS_API_KEY=<key>` in the
   Amplify app's environment variables.
3. Add a build prehook that runs `tsx scripts/fetch-content.ts` before `vite
   build` / `astro build` (Clona's `package.json` already does this).
4. Trigger an Amplify build. Confirm the site still works (it should, because
   `cms.generated.ts` is empty and your legacy data still wins).
5. Migrate one piece of content at a time. After each migration, redeploy and
   confirm the article appears identically.

---

## 4. Content migration mechanics

There are two ways to get existing content into the CMS:

### A. Manual paste (recommended for under 30 items)

Open Studio → Blog (or Case studies). Click **Write a post**. Paste the
existing title, body, and meta. Set the publish date to match the legacy
date so the URL and ordering don't change. Save as **published**.

This is faster than building a script for any site with under ~30 articles.

### B. One-off import script

For larger libraries, write a 50-line script that:

1. Reads the legacy `*.legacy.ts` file.
2. For each item, inserts a row directly via the Supabase service role.
3. Maps fields: `title`, `slug`, `body_html` (or `body_md` if you store
   Markdown), `cover_url`, `tags`, `category`, `status: 'published'`,
   `published_at`.

The CMS doesn't need the legacy file to survive after migration — but keep
it in version control for at least a release cycle in case a row imports
incorrectly and you need to compare.

### Slug stability is the only thing that matters

URLs you have indexed today **must** keep working. Set the slug in the CMS
to exactly match the legacy slug. Studio enforces uniqueness per site, so
duplicates are caught at save time.

---

## 5. Switching modes

You move between modes by toggling environment variables — no code edits.

| Mode | `CMS_URL` | `CMS_API_KEY` | Behavior |
|---|---|---|---|
| Static-only | unset | unset | Pure legacy fallback. |
| Hybrid (CMS optional) | set | optional | Tries CMS, falls back to legacy on error or empty. |
| CMS-only | set | set | CMS is authoritative. Remove `*.legacy.ts` from imports. |

Going from hybrid to CMS-only is a code change in each site's catalog file:
replace the conditional re-export with a direct import from
`cms.generated.ts`, then delete `*.legacy.ts`. Do this only once you're
confident nobody will need a quick rollback.

---

## 6. SEO and performance during the cut-over

Because content is fetched at **build time** and the resulting HTML is served
from Amplify's CDN, the runtime performance is unchanged. Pages stay
fully-static. Lighthouse scores should not move.

Watch these signals after each migration:

- **Google Search Console — Coverage.** No new "404" or "Crawled, not
  indexed" entries appearing within 48h of a migration.
- **Sitemap.** Each site's sitemap generation already reads from the same
  catalog files, so it picks up CMS-published content automatically.
- **Internal links.** If you have hard-coded links to specific slugs in
  marketing copy, they keep working as long as slugs match.

---

## 7. Verification checklist per site

Run this on every site before flipping the env vars in production. Each
should take five minutes.

- [ ] **Local build with no CMS env vars** still succeeds. (`npm run build`
      with `CMS_URL` unset.) Confirms the static-only safety net.
- [ ] **Local build with CMS env vars** succeeds, prints "wrote N records".
- [ ] Open the built site (`npm run preview`) and visit one migrated URL.
      It renders identically to before.
- [ ] **Test contact form submission.** Open the live site, submit a real
      test message, confirm it lands in Studio → Submissions and that the
      notification email arrives (per-site Resend key configured in Studio →
      Settings → Form notifications).
- [ ] **Webhook fires on publish.** Edit any article in Studio, save as
      published, confirm Amplify starts a build within ~30s. (Configured in
      Studio → Settings → Amplify webhook URL.)
- [ ] **API key works from curl.**
      `curl -H "Authorization: Bearer <key>" https://cms.fousventures.com/api/v1/sites/<slug>/blog-posts`
      returns JSON with your posts.

If all six pass, the site is live on the CMS. Send the client login.

---

## 8. New site, future-proofing

For every new site you stand up after the initial four, the recipe is:

1. In Studio → Platform admin → Sites, click **Add site**. Set slug, name,
   primary domain, brand color.
2. Define its content schema in `studio/src/lib/schemas/<slug>.ts` (the
   Clona file is the simplest example).
3. In the new site's repo, copy `clona/src/lib/cms.ts` and
   `clona/scripts/fetch-content.ts`. Adjust the resource list to match the
   schema you registered above.
4. In the new site's repo, add `.env.example` entries for `CMS_URL`,
   `CMS_API_KEY`, `VITE_FORMS_URL`, `VITE_TURNSTILE_SITE_KEY`.
5. Wire the contact form to POST to `VITE_FORMS_URL` (see Clona's CTA
   component).
6. Add the site's row in Studio → Settings: Resend, webhook URL, custom CMS
   subdomain.
7. Run through the verification checklist above.

That's the whole process. The CMS scales with you; you don't have to add
schema registrations to a deploy of Studio for the most common case (you can
work entirely through the dashboard).
