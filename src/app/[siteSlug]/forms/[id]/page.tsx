import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SubmissionStatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/utils";
import type { FormSubmission, Profile } from "@/lib/supabase/types";
import { SubmissionEditor } from "./submission-editor";

export const metadata = { title: "Submission" };

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<FormSubmission>();

  if (!row) notFound();

  const { data: members } = await supabase
    .from("site_members")
    .select("user:profiles(id, full_name, email)")
    .eq("site_id", site.id);

  const assignableUsers =
    (members as Array<{ user: Pick<Profile, "id" | "full_name" | "email"> }> | null)
      ?.map((m) => m.user)
      .filter(Boolean) ?? [];

  const payload = (row.payload ?? {}) as Record<string, string>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Link
          href={`/${siteSlug}/forms`}
          className="mb-3 inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" /> Back to inbox
        </Link>
        <PageHeader
          title={payload.name ?? payload.full_name ?? payload.email ?? row.form_name}
          description={`${row.form_name} · ${formatDate(row.created_at, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
          action={<SubmissionStatusPill status={row.status} />}
        />
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <dl className="grid gap-y-3 gap-x-6 text-sm sm:grid-cols-[140px_1fr]">
            {Object.entries(payload).map(([k, v]) => (
              <FieldRow key={k} label={k}>
                {String(v)}
              </FieldRow>
            ))}
            {row.source_url && (
              <FieldRow label="Source URL">
                <a className="underline" href={row.source_url} target="_blank" rel="noreferrer">
                  {row.source_url}
                </a>
              </FieldRow>
            )}
            {row.ip_address && <FieldRow label="IP">{row.ip_address}</FieldRow>}
            {row.user_agent && <FieldRow label="User agent">{row.user_agent}</FieldRow>}
          </dl>
        </div>
      </div>
      <SubmissionEditor
        siteSlug={siteSlug}
        id={id}
        initialStatus={row.status}
        initialNotes={row.notes ?? ""}
        initialAssignedTo={row.assigned_to}
        members={assignableUsers}
      />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className="break-words text-[var(--color-fg)]">{children}</dd>
    </>
  );
}
