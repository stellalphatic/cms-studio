import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageForm } from "../page-form";
import { deletePage, updatePage } from "../actions";

export const metadata = { title: "Edit page" };

interface PageRow {
  id: string;
  title: string;
  slug: string;
  body_html: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  seo: Record<string, unknown> | null;
}

export default async function EditPageRoute({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, title, slug, body_html, status, seo")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<PageRow>();

  if (!page) notFound();

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
        initial={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          body_html: page.body_html ?? "",
          status: page.status,
          seo: page.seo ?? {},
        }}
        onSubmit={async (fd) => {
          "use server";
          await updatePage(siteSlug, id, fd);
        }}
        onDelete={async () => {
          "use server";
          await deletePage(siteSlug, id);
        }}
      />
    </div>
  );
}
