# @studio/cms

A 100-line, zero-dep TypeScript client for the Studio CMS public API. Works in
Node 18+, browsers, edge runtimes, and Cloudflare Workers.

## Install

The simplest path is to **vendor the file**. Copy `studio-cms.ts` into your
repo (e.g. `src/lib/cms.ts`) — it has no dependencies. That keeps each site
self-contained and frees you from version-pinning a private package.

If you'd rather link as a workspace dep:

```bash
# in your site's package.json
"@studio/cms": "file:../studio/packages/sdk"
```

## Usage

```ts
import { createCmsClient } from "@studio/cms";

const cms = createCmsClient({
  baseUrl: process.env.CMS_URL!,    // https://admin.yourdomain.com
  site: "kingsbridge",              // matches sites.slug in Studio
  apiKey: process.env.CMS_API_KEY,  // optional if no keys exist yet
  cacheSeconds: 60,                 // useful at build time
});

const { data: posts } = await cms.list("blog-posts", { limit: 10 });
const post = await cms.getBySlug("blog-posts", "hello-world");
const { data: faqs } = await cms.list("faqs");
const info = await cms.info();
```

## Resources

| Type            | Notes                                              |
| --------------- | -------------------------------------------------- |
| `blog-posts`    | Filter by `slug`, `category`, `tag`, `limit`.      |
| `case-studies`  | Filter by `slug`, `category`, `limit`.             |
| `testimonials`  | Sorted by `weight` desc.                           |
| `faqs`          | Sorted by `category`, `sort_order`.                |
| `pricing`       | Sorted by `sort_order`.                            |
| `pathways`      | Immigration pathways. Filter by `slug`.            |
| `bulk-tiers`    | Sorted by `min_quantity`.                          |

## Build-time pattern

Recommended for SEO-perfect static sites: fetch at build, write to disk, ship
HTML. See `kingsbridgeImmigration/scripts/fetch-content.ts` and
`SearchHub_digital-/scripts/fetch-content.ts` in this monorepo for examples.
