import Link from "next/link";
import { ArrowDownToLine, Inbox } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SubmissionStatusPill } from "@/components/ui/status-pill";
import { formatRelative } from "@/lib/utils";
import type { FormSubmission, SubmissionStatus } from "@/lib/supabase/types";
import { FilterBar } from "./filter-bar";

export const metadata = { title: "Submissions" };

const STATUS_COUNTS: SubmissionStatus[] = [
  "new",
  "in_progress",
  "contacted",
  "closed",
  "spam",
];

export default async function FormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteSlug: string }>;
  searchParams: Promise<{ status?: string; q?: string; form?: string }>;
}) {
  const { siteSlug } = await params;
  const sp = await searchParams;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("form_submissions")
    .select("id, form_name, payload, status, created_at, source_url")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.status && sp.status !== "all") q = q.eq("status", sp.status);
  if (sp.form) q = q.eq("form_name", sp.form);

  const { data: rows } = await q;
  let submissions = (rows ?? []) as Pick<
    FormSubmission,
    "id" | "form_name" | "payload" | "status" | "created_at" | "source_url"
  >[];

  if (sp.q) {
    const needle = sp.q.toLowerCase();
    submissions = submissions.filter((s) =>
      JSON.stringify(s.payload).toLowerCase().includes(needle),
    );
  }

  // Counts per status
  const counts: Record<string, number> = {};
  await Promise.all(
    STATUS_COUNTS.map(async (s) => {
      const { count } = await supabase
        .from("form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("status", s);
      counts[s] = count ?? 0;
    }),
  );

  return (
    <div>
      <PageHeader
        title="Submissions"
        description="Every contact, audit, and consultation request lands here in real time."
        action={
          <a
            href={`/${siteSlug}/forms/export?${new URLSearchParams(sp as Record<string, string>).toString()}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium shadow-xs transition hover:bg-[var(--color-surface-2)]"
          >
            <ArrowDownToLine className="h-4 w-4" /> Export CSV
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/${siteSlug}/forms`}
          className={`rounded-full border px-3 py-1 text-xs ${!sp.status || sp.status === "all" ? "border-[var(--color-fg)] bg-[var(--color-fg)] text-white" : "border-[var(--color-border-strong)]"}`}
        >
          All
        </Link>
        {STATUS_COUNTS.map((s) => (
          <Link
            key={s}
            href={`/${siteSlug}/forms?status=${s}`}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${sp.status === s ? "border-[var(--color-fg)] bg-[var(--color-fg)] text-white" : "border-[var(--color-border-strong)]"}`}
          >
            <span className="capitalize">{s.replace("_", " ")}</span>
            <span className="opacity-70">({counts[s] ?? 0})</span>
          </Link>
        ))}
      </div>

      <FilterBar siteSlug={siteSlug} initialQ={sp.q ?? ""} initialForm={sp.form ?? ""} />

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {submissions.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] text-left text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">From</th>
                <th className="px-4 py-2.5 font-medium">Form</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {submissions.map((s) => {
                const p = (s.payload ?? {}) as Record<string, string>;
                const name = p.name ?? p.full_name ?? p.fullName ?? p.email ?? "—";
                const email = p.email ?? "";
                return (
                  <tr key={s.id} className="hover:bg-[var(--color-surface-2)]">
                    <td className="px-4 py-3">
                      <Link href={`/${siteSlug}/forms/${s.id}`} className="font-medium hover:underline">
                        {name}
                      </Link>
                      {email && <div className="text-xs text-[var(--color-fg-subtle)]">{email}</div>}
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--color-fg-muted)]">{s.form_name}</td>
                    <td className="px-4 py-3"><SubmissionStatusPill status={s.status} /></td>
                    <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatRelative(s.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto h-6 w-6 text-[var(--color-fg-subtle)]" />
            <p className="mt-3 text-sm font-medium">Inbox zero</p>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              When someone fills a form on your site it lands here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
