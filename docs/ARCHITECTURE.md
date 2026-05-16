# Architecture · how everything actually works

> The mental model for the whole stack: who sends what to whom, when, and
> how the data ends up on a reader's screen.

If you only read one doc, read this one. The rest of `/docs/` is reference
material for specific tasks.

---

## The three runtimes

You're operating three programs, each with a different job and a different
hosting service.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   STUDIO (Next.js)              Supabase                Public site  │
│   on Vercel                     (Postgres +             on Amplify   │
│                                 Edge Functions +        (Vite/Astro) │
│                                  Auth + Storage)                     │
│                                                                      │
│  - dashboard UI                 - rows                  - readers    │
│  - server actions          ◄──► - auth                  - forms      │
│  - public API              ◄──► - storage          ◄──► (no DB call) │
│  - editor                       - edge fn /submit                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Studio** is for you and your editors. It writes to and reads from Supabase.
**Supabase** holds everything: content rows, auth users, uploaded media, the
form-submission inbox, build-job queue. **The public sites** never call the
database for content. They only call Supabase for one thing: posting a contact
form to the `submit-form` Edge Function.

Why never read content live from the database? Three reasons:

1. **Speed.** Pre-built HTML on Amplify's CDN beats every "ISR / SSR / SWR /
   client-fetch" combination for first-paint speed and reliability.
2. **SEO.** Every page is fully-rendered HTML at request time zero. Google
   indexes the words, not a skeleton.
3. **Cost & blast radius.** Your readers can't take down your CMS by going
   viral, and they can't see draft content even if the API is misconfigured.

---

## What is "live" vs "rebuilt"

There are two clocks running at all times.

| Surface | When does it update? |
|---|---|
| Studio dashboard (you log in to) | Live. Every save reflects within ms. |
| Submission inbox | Live. New form submissions show up as soon as Supabase confirms the row. |
| The reader-facing site (HTML on Amplify) | Rebuilt when you click **Publish** in Studio. |

So when you publish a blog post, here is the actual sequence:

```
0 ms     You click Publish in Studio.
0 ms     Server action updates blog_posts.status='published' in Postgres.
0 ms     Postgres trigger enqueue_build_job() inserts a row into build_jobs.
0 ms     Server returns; toast says "Saved". You see the new state in Studio.

~30 s    A small Vercel cron sweep picks up the queued job (or a Supabase
         trigger fires immediately — depending on which path is configured).

~30 s    Studio's webhook dispatcher POSTs to your Amplify webhook URL.
~30 s    Amplify starts a new build of the public site.

~90 s    Build runs `tsx scripts/fetch-content.ts` which pulls the latest
         published rows from Studio's public API and writes a typed data
         file the Vite/Astro build consumes.

~120 s   Amplify deploys the new artifact to its CDN.
         Readers worldwide start seeing the new post on next page load.
```

That ~30s window between "saving in Studio" and "Amplify build starts" is
the **build debounce**. It exists so saving four times in a row only
triggers one rebuild, which keeps you under the free tier's build minutes
and doesn't churn the CDN.

---

## How the Amplify webhook works

It's the cheapest, most reliable trigger AWS offers.

1. In **Amplify Console → App settings → Build settings → Incoming
   webhooks**, you create a webhook for the `main` branch. AWS gives you a
   URL like:

   ```
   https://webhooks.amplify.us-east-1.amazonaws.com/prod/webhooks?id=…&token=…&operation=startbuild
   ```

2. You paste that URL into **Studio → Settings → Build webhook URL** for that
   site.

3. When a publish happens, Studio's dispatcher POSTs (empty body) to that URL.
   Amplify responds 200 and queues a new build.

There's nothing else to do. No GitHub webhook, no Lambda, no SQS queue. It
is genuinely a one-liner of infrastructure.

> **You can test this right now:** copy the URL, paste into the address bar
> of a tool like `curl` (or even a browser — POST not GET), and Amplify will
> queue a build immediately. If that works in isolation but doesn't fire from
> Studio, the URL is misconfigured in Settings.

---

## What about really fast updates?

If you absolutely need a change to be live in seconds (a typo fix on a
high-traffic post during a launch), you have three options, in order of
reasonableness:

1. **Just wait the rebuild.** 90 seconds is fine for almost everything.
2. **Trigger an immediate rebuild manually** from the Amplify console by
   clicking "Redeploy this version" or POSTing the webhook URL yourself.
3. **Build dynamic per-post preview routes** (Studio already supports this:
   `/preview/blog/<slug>?token=…`) and link to those temporarily while the
   build completes.

There is also the long-term path of moving the public sites to **on-demand
revalidation** via Next.js ISR (set `revalidate: 60` per route). That trades
build simplicity for runtime cost. It's not needed today and we shouldn't
adopt it speculatively.

---

## How a form submission flows

This one is fully live. No rebuild involved.

```
Reader fills the contact form on, say, searchhub.digital.
   ↓
Browser POSTs JSON to https://<supabase-project>.supabase.co/functions/v1/submit-form
   ↓
Edge Function:
   1. Looks up the site by slug.
   2. Verifies the request origin against `sites.allowed_origins`.
   3. (Optional) Verifies the Cloudflare Turnstile token if set.
   4. Inserts a row into form_submissions (site_id, form_name, payload, …).
   5. Reads sites.resend_api_key + resend_from_email + notify_emails.
   6. Sends a notification email via Resend.
   7. Returns 200 { ok: true } to the reader.

You see the new row appear in Studio → Submissions in real time
(no refresh; Supabase Realtime subscription).
```

Time from form click to inbox row: well under 1 second.

---

## Hybrid mode (the safety net)

Every public site's build script first checks for `CMS_URL` + `CMS_API_KEY`
in the environment. There are three behaviors:

| Env vars | Behavior |
|---|---|
| **Neither set** | Build uses the `*.legacy.ts` files. Site builds the same as it did before the CMS existed. **This is the safe default.** |
| **Set + CMS returns rows** | Build writes `cms.generated.ts` with the live rows. Site uses those. |
| **Set + CMS returns zero rows** | Build still falls back to `*.legacy.ts`. Better to ship old content than no content. |

This is why integrating the CMS is **not a one-way door**. If anything goes
wrong, remove the env vars from Amplify, redeploy, and you're back on the
legacy data in 90 seconds.

See [`MIGRATION_AND_ROLLOUT.md`](./MIGRATION_AND_ROLLOUT.md) for the rollout
strategy.

---

## Roles, RLS, and the security model

Every database query that goes through Studio uses the user's auth token,
which means **Row-Level Security in Postgres is the wall**, not the app.
Bypassing the UI doesn't bypass the rules.

- `profiles.is_platform_admin` — superuser flag. The first user signs up
  becomes this automatically. Can see and edit every site.
- `site_members.role` — per-site permission. `owner > admin > editor > viewer`.
  - **owner**: full control of the site, including deleting it.
  - **admin**: site settings, people, API keys, all content.
  - **editor**: content (blog, case studies, etc.), submissions inbox.
  - **viewer**: read-only.

A user can be a member of many sites with different roles each. The sidebar
"Manage" section (people, API keys, settings) only appears for admins+.

Platform admins are listed at `/admin`. From there you can create sites and
toggle other users' platform admin status.

---

## The public API

`GET https://cms.fousventures.com/api/v1/sites/<slug>` returns a descriptor
of available endpoints for a site. Each content type has its own endpoint:

- `…/blog-posts`
- `…/case-studies`
- `…/testimonials`
- `…/faqs`
- `…/services` (Clona-specific)
- `…/pathways`, `…/pricing`, `…/bulk-tiers` (site-dependent)

Behavior:

- If a site has **zero un-revoked API keys**, the endpoints are fully public
  read-only. Useful while bootstrapping.
- The moment you create at least one key, all endpoints require
  `Authorization: Bearer <key>`. The build script reads `CMS_API_KEY` and
  sends this header.

Responses are cached at the edge for 60 seconds with `stale-while-revalidate`,
so heavy build traffic doesn't hammer Supabase.

The SDK at `studio/packages/sdk/studio-cms.ts` (≈100 lines, zero deps) wraps
these endpoints if you'd rather not write fetch calls in every site.

---

## Per-site Resend (notifications)

Each site has its own `resend_api_key`, `resend_from_email`, and
`notify_emails` columns. The form-submission Edge Function reads these per
site and falls back to platform-wide env vars when they are not set.

| Site has `resend_api_key`? | Platform has `RESEND_API_KEY`? | Email sent from |
|---|---|---|
| Yes | (irrelevant) | Site's own Resend account |
| No | Yes | Platform default |
| No | No | **No email is sent.** Submission is still stored. |

The third case is the silent footgun — the submission goes to the inbox
fine, but nobody is notified. Always either set the site's Resend key or
the platform fallback before launching a contact form.

---

## CORS and `allowed_origins`

Browsers refuse to send `fetch()` from a public site to a different
origin's API unless the API explicitly allows it. The Edge Function reads
`sites.allowed_origins` (a text array) and reflects only matching origins
back as `Access-Control-Allow-Origin`.

- **Leave it empty during dev** — the function falls back to the
  `ALLOWED_ORIGINS` env var on Supabase, which can be `*` for testing.
- **Set it per site in production** — list every domain that hosts the
  contact form: `https://searchhub.digital, https://www.searchhub.digital`.
  Browsers from any other origin will be rejected with a CORS error.

You generally don't need to think about this for the public API endpoints
(`/api/v1/...`) because builds run server-side from Amplify, not from a
browser, and server-to-server requests aren't subject to CORS at all.

---

## Build-time vs request-time, the cheat sheet

| Action | When | Where | Cost |
|---|---|---|---|
| You publish a post in Studio | Instant in Studio. Live on the site in ~90s. | Studio + Amplify | One Amplify build (~3 min on free tier). |
| Reader loads a page | Instant. | Amplify CDN. | $0. |
| Reader submits a contact form | <1s. | Supabase Edge Function. | <$0.01/1000 calls. |
| You edit a draft repeatedly | Instant. No publish, no rebuild. | Studio only. | $0. |
| Reader requests `…/api/v1/sites/x/blog-posts` | <100ms cached, ~300ms fresh. | Vercel edge + Supabase. | Negligible. |

The system is engineered so that **the only thing that costs money or time
is publishing**. Drafting is free. Reading is free. Form submissions are
fractions of a cent.

---

## When to break the model

The architecture above is correct for content sites and small SaaS landing
pages. Cases where you should reach for something else:

- **Per-user dynamic dashboards on the public site** → use Next.js on Vercel
  for those routes; keep marketing static.
- **High-frequency live data (stock tickers, inventory)** → pull at request
  time from your own API, not from the CMS.
- **Tens of thousands of pages with low edit frequency** → the static-build
  story is still right, but you may want ISR (per-route revalidation) to
  avoid 30-minute full builds.

For everything you and your clients are running today, the model above is
the cheapest, fastest, and most reliable shape.
