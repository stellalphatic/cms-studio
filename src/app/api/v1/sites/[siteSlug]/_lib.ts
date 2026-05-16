import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyApiKey } from "@/lib/api-auth";
import type { Site } from "@/lib/supabase/types";

/**
 * Common entry point for every /api/v1/sites/<slug>/... handler.
 *
 *   const { site, cors, error } = await resolveSite(req, siteSlug);
 *   if (error) return error;
 *
 * - Looks up the site by slug.
 * - Verifies CORS against the site's allowed_origins (or '*').
 * - Verifies API key Authorization header — required only if the site has
 *   any active api_keys. If none are issued, the API is fully public read.
 * - Returns CORS headers ready to attach to the JSON response.
 */
export async function resolveSite(req: NextRequest, siteSlug: string) {
  const sb = createSupabaseAdminClient();
  const { data: site } = await sb
    .from("sites")
    .select("*")
    .eq("slug", siteSlug)
    .maybeSingle<Site>();

  const origin = req.headers.get("origin");
  const cors = buildCors(origin, site?.allowed_origins ?? []);

  if (req.method === "OPTIONS") {
    return { site: null as null, cors, error: new NextResponse(null, { status: 204, headers: cors }) };
  }
  if (!site) {
    return {
      site: null as null,
      cors,
      error: NextResponse.json({ error: "unknown_site" }, { status: 404, headers: cors }),
    };
  }

  // If at least one un-revoked API key exists for this site, gate access.
  const { count: gated } = await sb
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site.id)
    .is("revoked_at", null);

  if ((gated ?? 0) > 0) {
    const key = await verifyApiKey({
      siteId: site.id,
      authHeader: req.headers.get("authorization"),
    });
    if (!key) {
      return {
        site: null as null,
        cors,
        error: NextResponse.json(
          { error: "unauthorized", hint: "Send Authorization: Bearer <api_key>" },
          { status: 401, headers: cors },
        ),
      };
    }
  }

  return { site, cors, error: null as null };
}

export function jsonResponse<T>(
  data: T,
  cors: HeadersInit,
  init?: { status?: number; cache?: number; staleWhileRevalidate?: number },
) {
  const headers = new Headers(cors);
  headers.set("content-type", "application/json; charset=utf-8");
  // Edge / CDN caching. Public read API — safe to cache.
  const cache = init?.cache ?? 60; // 60s fresh
  const swr = init?.staleWhileRevalidate ?? 3600; // 1h stale
  headers.set("cache-control", `public, max-age=${cache}, s-maxage=${cache}, stale-while-revalidate=${swr}`);
  headers.set("x-content-type-options", "nosniff");
  return new NextResponse(JSON.stringify(data), { status: init?.status ?? 200, headers });
}

function buildCors(origin: string | null, allowed: string[]): HeadersInit {
  const allow =
    !allowed.length ||
    (origin && allowed.some((p) => origin === p || origin.endsWith(p)))
      ? origin ?? "*"
      : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
