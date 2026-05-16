import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ContentStatusPill } from "@/components/ui/status-pill";
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

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {cases.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] text-left text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Industry</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-surface-2)]">
                  <td className="px-4 py-3">
                    <Link href={`/${site.slug}/case-studies/${c.id}`} className="font-medium hover:underline">
                      {c.title || <span className="italic text-[var(--color-fg-subtle)]">(untitled)</span>}
                    </Link>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">/{c.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">{c.client ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">{c.industry ?? "—"}</td>
                  <td className="px-4 py-3"><ContentStatusPill status={c.status} /></td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatRelative(c.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium">No case studies yet</p>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">Showcase your wins.</p>
          </div>
        )}
      </div>
    </div>
  );
}
