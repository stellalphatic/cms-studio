import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Site } from "@/lib/supabase/types";

/**
 * Resolves the request's Host header into a "whitelabel site" if any site
 * has registered that host as its `cms_domain`.
 *
 *   Visiting cms.searchhub.digital  → returns the searchhub Site row
 *   Visiting admin.fousventures.com → returns null (the master portal)
 *   Visiting localhost              → returns null
 *
 * Cached for 60s in-memory to avoid hitting Postgres on every request.
 */
let CACHE: { at: number; map: Record<string, Site> } = { at: 0, map: {} };
const TTL_MS = 60_000;

async function loadMap(): Promise<Record<string, Site>> {
  if (Date.now() - CACHE.at < TTL_MS) return CACHE.map;
  try {
    const sb = createSupabaseAdminClient();
    const { data } = await sb
      .from("sites")
      .select("*")
      .not("cms_domain", "is", null);
    const map: Record<string, Site> = {};
    for (const s of (data as Site[] | null) ?? []) {
      if (s.cms_domain) map[s.cms_domain.toLowerCase()] = s;
    }
    CACHE = { at: Date.now(), map };
  } catch {
    // keep stale cache on failure
  }
  return CACHE.map;
}

export async function getWhitelabelSite(): Promise<Site | null> {
  const h = await headers();
  const raw = h.get("host") ?? h.get("x-forwarded-host") ?? "";
  const host = raw.toLowerCase().split(":")[0];
  if (!host) return null;
  const map = await loadMap();
  return map[host] ?? null;
}

/**
 * Invalidate the cache — call after Settings → "Custom CMS subdomain" is
 * saved so the new mapping takes effect without waiting for the TTL.
 */
export function invalidateWhitelabelCache() {
  CACHE = { at: 0, map: {} };
}
