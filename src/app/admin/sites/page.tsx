import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { NewSiteForm } from "./new-site-form";
import type { Site } from "@/lib/supabase/types";

export default async function AdminSitesPage() {
  const sb = createSupabaseAdminClient();
  const { data: sites } = await sb.from("sites").select("*").order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sites"
        description="Every workspace on the platform. Create new sites here — your platform-admin role is automatically granted owner on each one."
      />
      <NewSiteForm />

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Content</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(sites as Site[] | null)?.length ? (
              (sites as Site[]).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-6 w-6 place-items-center rounded text-[10px] font-semibold text-white"
                        style={{ background: s.brand?.primary ?? "#4f46e5" }}
                      >
                        {s.name.charAt(0)}
                      </span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.slug}</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">
                    {s.primary_domain ? (
                      <a
                        href={`https://${s.primary_domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--color-fg)]"
                      >
                        {s.primary_domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
                    {s.enabled_content_types.length} types
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${s.slug}`}
                      className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:bg-[var(--color-surface-2)]"
                    >
                      Open workspace →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-fg-muted)]">
                  No sites yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
