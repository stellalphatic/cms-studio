import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ContentStatusPill } from "@/components/ui/status-pill";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
import { formatRelative } from "@/lib/utils";
import type { CaseStudy } from "@/lib/supabase/types";

export const metadata = { title: "Case studies" };

export default async function CaseStudiesPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("case_studies")
    .select("id, title, slug, client, industry, status, updated_at")
    .eq("site_id", site.id)
    .order("updated_at", { ascending: false });

  const cases = (data ?? []) as Pick<
    CaseStudy,
    "id" | "title" | "slug" | "client" | "industry" | "status" | "updated_at"
  >[];

  return (
    <div>
      <PageHeader
        title="Case studies"
        description="Long-form proof-of-work pieces that showcase results."
        action={
          <Link href={`/${site.slug}/case-studies/new`}>
            <Button>
              <Plus className="h-4 w-4" /> New case study
            </Button>
          </Link>
        }
      />

      {cases.length > 0 ? (
        <DataTable>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Client</TH>
              <TH>Industry</TH>
              <TH>Status</TH>
              <TH align="right">Updated</TH>
            </TR>
          </THead>
          <TBody>
            {cases.map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link
                    href={`/${site.slug}/case-studies/${c.id}`}
                    className="block text-[14px] font-medium hover:underline underline-offset-4"
                    style={{ fontFamily: "var(--font-serif), serif" }}
                  >
                    {c.title || <span className="italic text-[var(--color-fg-subtle)]">(untitled)</span>}
                  </Link>
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">/{c.slug}</div>
                </TD>
                <TD muted>{c.client ?? "—"}</TD>
                <TD muted>{c.industry ?? "—"}</TD>
                <TD>
                  <ContentStatusPill status={c.status} />
                </TD>
                <TD muted align="right" mono>
                  {formatRelative(c.updated_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Empty
            icon={FileText}
            title="No case studies yet"
            hint="Showcase a win that turned into a result. Numbers, quotes, before-and-after."
            action={
              <Link href={`/${site.slug}/case-studies/new`}>
                <Button>
                  <Plus className="h-4 w-4" /> First case study
                </Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
