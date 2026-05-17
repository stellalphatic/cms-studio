import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { PageForm } from "../page-form";
import { createPage } from "../actions";

export const metadata = { title: "New page" };

export default async function NewPageRoute({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/${site.slug}/pages`}
          className="inline-flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] transition hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" /> Pages
        </Link>
      </div>
      <PageForm
        siteSlug={siteSlug}
        siteId={site.id}
        onSubmit={async (fd) => {
          "use server";
          await createPage(siteSlug, fd);
        }}
      />
    </div>
  );
}
