import { requireSiteAccess } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { CaseForm } from "../case-form";
import { createCaseStudy } from "../actions";

export const metadata = { title: "New case study" };

export default async function NewCasePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);

  return (
    <div>
      <PageHeader title="New case study" />
      <CaseForm
        siteSlug={siteSlug}
        siteId={site.id}
        onSubmit={async (fd) => {
          "use server";
          await createCaseStudy(siteSlug, fd);
        }}
      />
    </div>
  );
}
