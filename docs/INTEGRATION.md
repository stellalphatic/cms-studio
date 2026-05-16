# Integration Guide

How to onboard a new site into the Studio CMS in under 30 minutes.

## TL;DR

1. Add a row to `sites` (Studio Admin or SQL).
2. Generate an API key in Studio → API Keys.
3. Drop `studio-cms.ts` (or install `@studio/cms`) into the new site.
4. Build a `scripts/fetch-content.ts` that pulls at build time.
5. Wire the Amplify build webhook so content publishes trigger rebuilds.

That's the whole story. Read on for details.

---

## 1. Architecture in one paragraph

**Studio** (Next.js, deployed to Vercel) is the only thing connected to
Postgres/Supabase. Editors log in, write content, click "Publish". Studio
fires a debounced webhook to AWS Amplify; Amplify rebuilds the site; the new
build pulls the content via the Studio public API at build time and bakes it
into static HTML on CloudFront. End users never touch a database — every
page is pre-rendered, fully cached, instant TTFB, perfect Lighthouse.

```
┌─────────┐ writes  ┌──────────────┐ webhook  ┌─────────┐ pull   ┌──────────┐
│ Editor  │────────▶│  Studio CMS  │─────────▶│ Amplify │───────▶│ Public   │
└─────────┘         │   (Vercel)   │          │         │  API   │ HTML on  │
                    │   Supabase   │          │  build  │◀───────│ CloudFr. │
                    └──────────────┘          └─────────┘        └──────────┘
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

### D. Add env vars to AWS Amplify

In the Amplify console for the new site → App settings → Environment
variables:

```
CMS_URL=https://admin.yourdomain.com
CMS_API_KEY=sk_live_xxx          # the secret you copied in step 3
```

### E. Wire the publish-rebuild webhook

In Amplify → App settings → Build settings → **Incoming webhooks** →
create one for `main` → copy the URL. Paste into Studio → `acme` →
Settings → "Amplify webhook URL". Save.

Now any "Publish" in Studio triggers a rebuild within 30 seconds (debounce
prevents storms when an editor publishes 5 posts in a row).

## 5. Forms

Public sites POST to the **Edge Function** `submit-form`:

```ts
await fetch("https://YOUR-PROJECT.functions.supabase.co/submit-form", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    site: "acme",
    form: "contact",
    fields: { name, email, message },
    turnstileToken,           // from <Turnstile />
  }),
});
```

Submissions show up in Studio → `acme` → Submissions. If the site has a
Resend key + notify emails configured (Settings), the owner gets an email.

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
