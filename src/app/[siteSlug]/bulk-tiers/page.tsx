import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { BulkManager, type BulkTierRow } from "./bulk-manager";

export const metadata = { title: "Bulk pricing" };

export default async function BulkTiersPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("bulk_tiers")
    .select(
      "id, tier_name, link_count, price_per_link, total_price, description, features, highlight, sort_order, is_published",
    )
    .eq("site_id", site.id)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Bulk pricing"
        description="Packages shown on your pricing page. Mark one as recommended to spotlight it."
      />
      <BulkManager
        siteSlug={siteSlug}
        rows={(data as BulkTierRow[] | null) ?? []}
        canEdit={hasRole(role, "editor")}
      />
    </div>
  );
}
