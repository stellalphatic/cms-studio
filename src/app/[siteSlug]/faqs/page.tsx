import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { FaqsManager, type FaqRow } from "./faqs-manager";

export const metadata = { title: "FAQs" };

export default async function FaqsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: faqs } = await supabase
    .from("faqs")
    .select("id, question, answer_html, category, sort_order, is_published, updated_at")
    .eq("site_id", site.id)
    .order("category", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });

  const list = (faqs as FaqRow[] | null) ?? [];
  const categories = Array.from(new Set(list.map((f) => f.category).filter(Boolean) as string[]));

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="FAQs"
        description="Categorised question/answer pairs that ship to the site."
      />
      <FaqsManager
        siteSlug={siteSlug}
        faqs={list}
        canEdit={hasRole(role, "editor")}
        categories={categories}
      />
    </div>
  );
}
