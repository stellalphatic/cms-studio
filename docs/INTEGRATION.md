# Integration Guide

How to onboard a new site into the Studio CMS in under 30 minutes.

## TL;DR

1. **Create the workspace.** Studio → Admin → Sites → "New site".
2. **Mint a key.** Open the new workspace → API Keys → "Create key". Copy
   the secret (you only see it once).
3. **Open the Integration page.** Studio → workspace → **Integration**.
   Copy the env block that matches your framework (Vite, Astro, Next.js)
   into your site's `.env`.
4. **Vendor or install the SDK** (`studio/packages/sdk/studio-cms.ts`).
5. **Add a `prefetch` step** to your build (`scripts/fetch-content.ts`) so
   your bundler ships static content.
6. **Wire a deploy hook** in your host (Vercel / Amplify / Netlify /
   Cloudflare / Render) and paste the URL into Studio → workspace →
   Settings → "Deploy hook URL".

That's the whole story. Read on for details — or hand
`docs/AGENT_INTEGRATION_PROMPT.md` to an AI coding agent and watch it do
the work.

---

## 1. Architecture in one paragraph

**Studio** (Next.js, deployed to Vercel) is the only thing connected to
Postgres/Supabase. Editors log in, write content, click "Publish". Studio
fires a debounced deploy-hook POST to **your host of choice** (Vercel,
Amplify, Netlify, Cloudflare Pages, Render); that host rebuilds the site;
the build pulls content via the Studio public API at build time and bakes
it into static HTML on the host's CDN. End users never touch a database —
every page is pre-rendered, fully cached, instant TTFB, perfect Lighthouse.

```
┌─────────┐ writes  ┌──────────────┐ deploy  ┌──────────┐ pull   ┌──────────┐
│ Editor  │────────▶│  Studio CMS  │────────▶│  Host    │───────▶│ Public   │
└─────────┘         │   (Vercel)   │  hook   │ rebuilds │  API   │ HTML on  │
                    │   Supabase   │         │          │◀───────│  CDN     │
                    └──────────────┘         └──────────┘        └──────────┘
```

## 2. Add a new site in Studio

### Option A — Studio UI (easiest)

Visit `/admin` → New site → fill name, slug, primary domain, brand color.
Save. You're now in that workspace.

### Option B — SQL (programmatic)

```sql
insert into public.sites (slug, name, primary_domain, brand, enabled_content_types)
values (
  'acme',
  'Acme Co',
  'acme.com',
  '{"primary":"#0EA5E9","tagline":"Better widgets"}'::jsonb,
  array['blog_posts','case_studies','testimonials','faqs']
);
```

The trigger from `0003_bootstrap_admin.sql` automatically grants you (the
platform admin) `owner` on the new site.

## 3. Generate an API key

Studio → `acme` workspace → **API Keys** → **Create key** → copy the secret
once shown (you'll never see it again — store it in your CI's secret store).

If you skip this step, the public API stays open read-only on this site —
useful for prototyping but **set a key before launch**.

## 4. Plug into a new site

### A. Vendor the SDK (recommended for Astro / Vite)

Copy `studio/packages/sdk/studio-cms.ts` to `src/lib/cms.ts` in the new site.
Zero deps.

### B. Build-time fetch script

Create `scripts/fetch-content.ts`:

```ts
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createCmsClient } from "../src/lib/cms";

const cms = createCmsClient({
  baseUrl: process.env.CMS_URL!,
  site: "acme",
  apiKey: process.env.CMS_API_KEY!,
});

const out = join(process.cwd(), "src/data/cms.generated.ts");
await mkdir(dirname(out), { recursive: true });

const [{ data: posts }, { data: faqs }] = await Promise.all([
  cms.list("blog-posts", { limit: 200 }),
  cms.list("faqs"),
]);

await writeFile(
  out,
  `// AUTO-GENERATED. Do not edit.
export const BLOG_POSTS = ${JSON.stringify(posts, null, 2)};
export const FAQS = ${JSON.stringify(faqs, null, 2)};
`,
);
console.log(`✔ wrote ${posts.length} posts, ${faqs.length} faqs`);
```

### C. Wire it into your build

**Vite / React:**

```jsonc
// package.json
{
  "scripts": {
    "prefetch": "tsx scripts/fetch-content.ts",
    "build": "npm run prefetch && vite build"
  }
}
```

**Astro:**

```jsonc
{
  "scripts": {
    "prefetch": "tsx scripts/fetch-content.ts",
    "build": "npm run prefetch && astro build"
  }
}
```

**Next.js (no script needed — fetch directly in Server Components):**

```ts
// app/blog/page.tsx
import { createCmsClient } from "@/lib/cms";

export const revalidate = 60;

export default async function Blog() {
  const cms = createCmsClient({
    baseUrl: process.env.CMS_URL!,
    site: "acme",
    apiKey: process.env.CMS_API_KEY!,
  });
  const { data: posts } = await cms.list("blog-posts");
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

### D. Add env vars to your host

The exact variable block is generated for you in
**Studio → workspace → Integration**. Copy the section that matches your
framework, paste it into your host's environment-variables page, and replace
`<paste-the-secret-from-API-Keys>` with the secret you copied in step 3.

Reference (the Integration page tailors these to *your* Studio URL):

```
# Vite (Kingsbridge, SearchHub, Clona)
VITE_CMS_URL=https://your-studio.example.com
VITE_CMS_SITE=acme
VITE_CMS_API_KEY=sk_live_xxx
VITE_FORMS_URL=https://YOUR-PROJECT.functions.supabase.co/submit-form
VITE_FORMS_SITE=acme
VITE_TURNSTILE_SITE_KEY=0x4AAAAA…

# Astro (Vantage)
CMS_URL=…   CMS_SITE=acme   CMS_API_KEY=sk_live_xxx
PUBLIC_FORMS_URL=…           PUBLIC_FORMS_SITE=acme
PUBLIC_TURNSTILE_SITE_KEY=…

# Next.js (future sites)
NEXT_PUBLIC_CMS_URL=…        NEXT_PUBLIC_CMS_SITE=acme   CMS_API_KEY=sk_live_xxx
NEXT_PUBLIC_FORMS_URL=…      NEXT_PUBLIC_FORMS_SITE=acme
NEXT_PUBLIC_TURNSTILE_SITE_KEY=…
```

### E. Wire the publish-rebuild deploy hook

Studio supports any host that exposes a plain POST-able deploy hook URL:

| Host                 | Where to create the hook |
|----------------------|--------------------------|
| **Vercel**           | Project → Settings → Git → *Deploy Hooks* |
| **AWS Amplify**      | App settings → Build settings → *Incoming webhooks* |
| **Netlify**          | Site settings → Build & deploy → *Build hooks* |
| **Cloudflare Pages** | Project → Settings → Builds & deployments → *Deploy hooks* |
| **Render**           | Service → Settings → *Deploy hook* |

Copy the URL, paste into Studio → workspace → Settings → "Deploy hook URL",
save. Now any "Publish" in Studio triggers a rebuild within ~30 seconds
(debounce prevents storms when an editor publishes 5 posts in a row).

## 5. Forms

Public sites POST to the **CMS URL** — same domain as content reads.
Supabase is never exposed to the browser:

```ts
await fetch(`${import.meta.env.VITE_CMS_URL}/api/v1/sites/${import.meta.env.VITE_CMS_SITE}/submit-form`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    form_name: "contact",
    payload: { name, email, message },     // anything you want stored
    turnstileToken,                         // from <Turnstile />, optional
  }),
});
```

Or with the SDK:

```ts
await cms.submitForm({
  form_name: "contact",
  payload: { name, email, message },
});
```

Submissions show up in Studio → workspace → Submissions. If the site has
a Resend key + notify emails configured (Settings), the owner gets an
email immediately.

The legacy Supabase Edge Function (`/functions/v1/submit-form`) is still
shipped for power users and internal automation, but the CMS endpoint is
the recommended public surface — it's whitelabelable, requires no anon
key, and keeps the backend invisible.

## 6. Whitelabel CMS subdomain (optional)

If a client wants `cms.acme.com` instead of `admin.yourdomain.com/acme`:

1. Studio → `acme` → Settings → "Custom CMS subdomain" = `cms.acme.com`.
2. Add `cms.acme.com` as a domain in Vercel for the Studio project.
3. Have the client CNAME `cms.acme.com` to Vercel's value.

When `cms.acme.com` resolves, Studio middleware (`updateSession`) redirects
authenticated visitors directly into the `acme` workspace — branded with
their colors, hidden from other workspaces in the sidebar.

## 7. Per-site Resend (each owner gets their own emails)

Each site row has `resend_api_key`, `resend_from_email`, `notify_emails`.
Set them in Studio → Settings → Form notifications. The submit-form Edge
Function reads these per-request, so you can rotate / change without
redeploying anything.

## 8. Ranking / SEO checklist

The architecture is SEO-perfect by design — each public site is 100% static
HTML on CloudFront. To preserve this:

- ✅ **Always render content as real HTML at build** (the pattern above).
  Avoid client-side fetches for primary content.
- ✅ **Use the `seo` jsonb field** on each blog/case study to write per-page
  meta tags (`title`, `description`, `og:image`).
- ✅ **Keep slugs stable**. Studio warns before changing a slug on a
  published item.
- ✅ **Sitemaps**: each site generates its own (Vite/React example sitemap
  iterates over `BLOG_POSTS` from `cms.generated.ts`).
- ✅ **301 redirects on slug changes** — wire to your CDN / static host.

## 9. API reference

Base URL: `https://admin.yourdomain.com/api/v1/sites/<site-slug>`

| Method | Path                          | Notes                                   |
| ------ | ----------------------------- | --------------------------------------- |
| GET    | `/`                           | Site descriptor + endpoint list         |
| GET    | `/blog-posts`                 | `?limit&offset&slug&category&tag`       |
| GET    | `/case-studies`               | `?limit&slug&category`                  |
| GET    | `/testimonials`               | Sorted by `weight` desc                 |
| GET    | `/faqs`                       | Sorted by `category, sort_order`        |
| GET    | `/pricing`                    | Sorted by `sort_order`                  |
| GET    | `/pathways`                   | `?slug` (Kingsbridge-style sites)       |
| GET    | `/bulk-tiers`                 | Sorted by `min_quantity`                |

Auth: `Authorization: Bearer <api_key>` if any active key exists for the
site, otherwise public read.

Caching: every response is `Cache-Control: public, max-age=60,
stale-while-revalidate=3600` — Vercel's edge caches it for free.

## 10. FAQ

**Q: Should I deploy Studio on Vercel or Amplify?**
A: Vercel. It's purpose-built for Next.js 15 App Router. The free hobby tier
covers a single-tenant CMS; the Pro tier ($20/mo) handles dozens of sites
with traffic. Public client sites stay on AWS Amplify.

**Q: anon/service vs publishable/secret keys?**
A: Both formats work. New Supabase projects show both on the dashboard.
The legacy JWT keys you have now are not deprecated — they'll work for
years. Either is fine; do not mix them.

**Q: Do I need a separate Supabase project per site?**
A: No. The schema is multi-tenant — every row carries `site_id`, RLS
isolates per-site access. Adding a new site = one row in `sites`, not a new
project.

**Q: What if a future site has wildly different content (e.g. an event
calendar)?**
A: Two options. (1) Use the `custom_fields` jsonb on existing tables for
small additions. (2) Add a new dedicated table + RLS policy + an API route +
a sidebar entry. The `immigration_pathways` table (Kingsbridge) is the
template.

**Q: Cost at scale?**
A: Supabase Pro $25/mo handles ~10 sites comfortably. Vercel Pro $20/mo for
Studio. Resend Free tier covers most form-notification volumes. Amplify
billing scales per site as today.
