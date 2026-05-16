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
  const slug = url.searchParams.get("slug");

  const sb = createSupabaseAdminClient();
  let q = sb
    .from("immigration_pathways")
    .select("id, slug, title, category, summary, body_html, eligibility, process_steps, fees, processing_time, cover_url, sort_order, custom_fields")
    .eq("site_id", site.id)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (slug) q = q.eq("slug", slug);

  const { data, error: dbErr } = await q;
  if (dbErr) return jsonResponse({ error: dbErr.message }, cors, { status: 500 });
  return jsonResponse({ data, count: data?.length ?? 0 }, cors);
}
