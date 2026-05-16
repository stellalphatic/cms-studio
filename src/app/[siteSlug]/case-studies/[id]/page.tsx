import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { CaseForm } from "../case-form";
import { deleteCaseStudy, updateCaseStudy } from "../actions";
import type { CaseStudy } from "@/lib/supabase/types";

export const metadata = { title: "Edit case study" };

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("case_studies")
    .select("*")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<CaseStudy>();

  if (!data) notFound();

  return (
    <div>
      <PageHeader title={data.title || "(untitled)"} description={`/${data.slug}`} />
      <CaseForm
        siteSlug={siteSlug}
        siteId={site.id}
        initial={data}
        onSubmit={async (fd) => {
          "use server";
          await updateCaseStudy(siteSlug, id, fd);
        }}
        onDelete={async () => {
          "use server";
          await deleteCaseStudy(siteSlug, id);
        }}
      />
    </div>
  );
}
