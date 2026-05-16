import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { jsonResponse, resolveSite } from "../_lib";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await ctx.params;
  const { error } = await resolveSite(req, siteSlug);
  return error ?? jsonResponse({}, {}, { cache: 0 });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await ctx.params;
  const { site, cors, error } = await resolveSite(req, siteSlug);
  if (error || !site) return error!;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const slug = url.searchParams.get("slug");
  const category = url.searchParams.get("category");

  const sb = createSupabaseAdminClient();
  let q = sb
    .from("case_studies")
    .select("*")
    .eq("site_id", site.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (slug) q = q.eq("slug", slug);
  if (category) q = q.eq("category", category);

  const { data, error: dbErr } = await q;
  if (dbErr) return jsonResponse({ error: dbErr.message }, cors, { status: 500 });
  return jsonResponse({ data, count: data?.length ?? 0 }, cors);
}
