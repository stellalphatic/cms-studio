/**
 * @studio/cms — drop-in client for the Studio CMS public API.
 *
 * Use this in any site (Vite, Next, Astro, Remix, Eleventy, plain Node)
 * to fetch published content. Built on the global `fetch`, so it works in
 * Node 18+, browsers, edge runtimes, and Cloudflare Workers.
 *
 * Usage:
 *   import { createCmsClient } from "@studio/cms";
 *
 *   const cms = createCmsClient({
 *     baseUrl: "https://admin.yourdomain.com",
 *     site: "kingsbridge",
 *     apiKey: process.env.CMS_API_KEY, // optional if site has no keys yet
 *   });
 *
 *   const { data: posts } = await cms.list("blog-posts", { limit: 20 });
 *   const { data: [post] } = await cms.list("blog-posts", { slug: "hello-world" });
 *
 * Designed to be one file, zero deps, easy to vendor into any repo.
 */

export interface CmsClientOptions {
  baseUrl: string;
  site: string;
  apiKey?: string;
  fetch?: typeof fetch;
  /** Cache the network response in-memory for N seconds. Useful at build time. */
  cacheSeconds?: number;
  /** Optional logger (defaults to console.warn). */
  onError?: (err: Error) => void;
}

export type ResourceType =
  | "blog-posts"
  | "case-studies"
  | "testimonials"
  | "faqs"
  | "pricing"
  | "pathways"
  | "bulk-tiers";

export interface ListResult<T = unknown> {
  data: T[];
  count: number;
}

interface CacheEntry {
  at: number;
  value: unknown;
}

export function createCmsClient(opts: CmsClientOptions) {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  const fetchImpl: typeof fetch = opts.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("[@studio/cms] No fetch implementation available");

  const cache = new Map<string, CacheEntry>();
  const ttl = (opts.cacheSeconds ?? 0) * 1000;

  async function request<T>(path: string): Promise<T> {
    // When the caller isn't using in-memory caching (typical for build-time
    // fetches), we also bypass Vercel's edge cache by appending a
    // timestamp and sending `cache: no-store`. Studio's public API treats
    // any `?_=…` query string as a cache-bypass signal. Runtime callers
    // that pass `cacheSeconds > 0` keep the edge cache and get the speed
    // benefit.
    const sep = path.includes("?") ? "&" : "?";
    const url = ttl > 0
      ? `${baseUrl}/api/v1/sites/${opts.site}${path}`
      : `${baseUrl}/api/v1/sites/${opts.site}${path}${sep}_=${Date.now()}`;
    if (ttl > 0) {
      const hit = cache.get(url);
      if (hit && Date.now() - hit.at < ttl) return hit.value as T;
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;
    const res = await fetchImpl(url, {
      headers,
      cache: ttl > 0 ? "default" : "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`[@studio/cms] ${res.status} ${url}: ${text || res.statusText}`);
    }
    const value = (await res.json()) as T;
    if (ttl > 0) cache.set(url, { at: Date.now(), value });
    return value;
  }

  return {
    /** Fetch the site descriptor and list of available endpoints. */
    async info() {
      try {
        return await request<{
          site: { slug: string; name: string; primary_domain: string | null; brand: Record<string, unknown>; enabled_content_types: string[] };
          endpoints: Array<{ type: string; url: string }>;
        }>("");
      } catch (e) {
        opts.onError?.(e as Error);
        throw e;
      }
    },

    /**
     * Generic list — works for every resource type.
     *
     *   cms.list("blog-posts", { limit: 10, category: "news" })
     *   cms.list("blog-posts", { slug: "my-post" })  // single by slug
     */
    async list<T = unknown>(
      type: ResourceType,
      params?: Record<string, string | number | undefined>,
    ): Promise<ListResult<T>> {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params ?? {})) {
        if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
      }
      const qs = search.toString();
      try {
        return await request<ListResult<T>>(`/${type}${qs ? `?${qs}` : ""}`);
      } catch (e) {
        opts.onError?.(e as Error);
        return { data: [], count: 0 };
      }
    },

    /** Convenience: fetch a single record by slug (returns null if not found). */
    async getBySlug<T = unknown>(type: ResourceType, slug: string): Promise<T | null> {
      const { data } = await this.list<T>(type, { slug });
      return data[0] ?? null;
    },

    /**
     * Submit a form. Posts to the CMS URL (not Supabase directly), so the
     * client site doesn't need to know anything about the backend.
     *
     *   await cms.submitForm({
     *     form_name: "contact",
     *     payload: { name, email, message },
     *     turnstileToken,    // optional
     *   });
     */
    async submitForm(input: {
      form_name?: string;
      payload: Record<string, unknown>;
      turnstileToken?: string;
    }): Promise<{ ok: true; id: string }> {
      const url = `${baseUrl}/api/v1/sites/${opts.site}/submit-form`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form_name: input.form_name ?? "contact",
          payload: input.payload,
          turnstileToken: input.turnstileToken ?? "",
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`[@studio/cms] submitForm ${res.status}: ${text || res.statusText}`);
      }
      return (await res.json()) as { ok: true; id: string };
    },
  };
}
