import type { NextRequest } from "next/server";
import { jsonResponse, resolveSite } from "./_lib";

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

  return jsonResponse(
    {
      site: {
        slug: site.slug,
        name: site.name,
        primary_domain: site.primary_domain,
        brand: site.brand,
        enabled_content_types: site.enabled_content_types,
      },
      endpoints: site.enabled_content_types.map((t) => ({
        type: t,
        url: `/api/v1/sites/${site.slug}/${t.replace(/_/g, "-")}`,
      })),
    },
    cors,
    { cache: 300 },
  );
}
