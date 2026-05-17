import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
import { ContentStatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/utils";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published" | "archived";
  updated_at: string;
}

export const metadata = { title: "Pages" };

export default async function PagesIndex({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("pages")
    .select("id, slug, title, status, updated_at")
    .eq("site_id", site.id)
    .order("updated_at", { ascending: false });

  const rows = (data as PageRow[] | null) ?? [];
  const canEdit = hasRole(role, "editor");

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Pages"
        description="Long-form static pages — About, Methodology, Terms, anything that isn't an article or case study."
        action={
          canEdit ? (
            <Link
              href={`/${siteSlug}/pages/new`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-fg)] px-3.5 text-sm font-medium text-[var(--color-bg)] transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New page
            </Link>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Empty
            icon={FileText}
            title="No pages yet"
            hint="Build long-form content pages your site renders at any route."
          />
        </div>
      ) : (
        <DataTable>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Slug</TH>
              <TH>Status</TH>
              <TH align="right">Updated</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((p) => (
              <TR
                key={p.id}
                className="cursor-pointer hover:bg-[var(--color-surface-2)]/40"
              >
                <TD>
                  <Link href={`/${siteSlug}/pages/${p.id}`} className="text-[14px] font-medium">
                    {p.title}
                  </Link>
                </TD>
                <TD mono>/{p.slug}</TD>
                <TD>
                  <ContentStatusPill status={p.status} />
                </TD>
                <TD muted align="right" mono>
                  {formatDate(p.updated_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
    </div>
  );
}
