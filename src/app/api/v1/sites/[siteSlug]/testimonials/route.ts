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

  const sb = createSupabaseAdminClient();
  const { data, error: dbErr } = await sb
    .from("testimonials")
    .select("id, author_name, author_role, quote, avatar_url, weight, custom_fields")
    .eq("site_id", site.id)
    .eq("is_published", true)
    .order("weight", { ascending: false });

  if (dbErr) return jsonResponse({ error: dbErr.message }, cors, { status: 500 });
  return jsonResponse({ data, count: data?.length ?? 0 }, cors);
}
