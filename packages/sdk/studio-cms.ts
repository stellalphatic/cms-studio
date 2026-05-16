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
    const url = `${baseUrl}/api/v1/sites/${opts.site}${path}`;
    if (ttl > 0) {
      const hit = cache.get(url);
      if (hit && Date.now() - hit.at < ttl) return hit.value as T;
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;
    const res = await fetchImpl(url, { headers });
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
  };
}
