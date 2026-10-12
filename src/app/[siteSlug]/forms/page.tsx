import Link from "next/link";
import { ArrowDownToLine, Inbox } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmissionStatusPill, WebinarPaymentPill } from "@/components/ui/status-pill";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
import { cn, formatRelative } from "@/lib/utils";
import type {
  FormSubmission,
  SubmissionStatus,
  WebinarPaymentStatus,
} from "@/lib/supabase/types";
import { FilterBar } from "./filter-bar";

export const metadata = { title: "Submissions" };

const STATUS_COUNTS: SubmissionStatus[] = ["new", "in_progress", "contacted", "closed", "spam"];

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
        description="Every contact, consultation, and webinar reservation lands here in real time."
        action={
          <a
            href={`/${siteSlug}/forms/export?${new URLSearchParams(sp as Record<string, string>).toString()}`}
          >
            <Button variant="secondary">
              <ArrowDownToLine className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        }
      />

      {/* Status filter row — segmented control, not pill buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        <FilterChip
          href={`/${siteSlug}/forms`}
          label="All"
          active={!sp.status || sp.status === "all"}
        />
        {STATUS_COUNTS.map((s) => (
          <FilterChip
            key={s}
            href={`/${siteSlug}/forms?status=${s}`}
            label={s.replace("_", " ")}
            count={counts[s] ?? 0}
            active={sp.status === s}
          />
        ))}
      </div>

      <FilterBar siteSlug={siteSlug} initialQ={sp.q ?? ""} initialForm={sp.form ?? ""} />

      {submissions.length > 0 ? (
        <DataTable>
          <THead>
            <TR>
              <TH>From</TH>
              <TH>Form</TH>
              <TH>Status</TH>
              <TH align="right">Received</TH>
            </TR>
          </THead>
          <TBody>
            {submissions.map((s) => {
              const payload = (s.payload ?? {}) as Record<string, string>;
              const name = payload.name ?? payload.full_name ?? payload.fullName ?? payload.email ?? "—";
              const email = payload.email ?? "";
              const paymentStatus = payload.payment_status as WebinarPaymentStatus | undefined;
              return (
                <TR key={s.id}>
                  <TD>
                    <Link
                      href={`/${siteSlug}/forms/${s.id}`}
                      className="block text-[14px] font-medium hover:underline underline-offset-4"
                    >
                      {name}
                    </Link>
                    {email && (
                      <div className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">
                        {email}
                      </div>
                    )}
                  </TD>
                  <TD muted mono>
                    {s.form_name}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SubmissionStatusPill status={s.status} />
                      {paymentStatus &&
                        (paymentStatus === "unpaid" ||
                          paymentStatus === "paid" ||
                          paymentStatus === "refunded") && (
                          <WebinarPaymentPill status={paymentStatus} />
                        )}
                    </div>
                  </TD>
                  <TD muted align="right" mono>
                    {formatRelative(s.created_at)}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </DataTable>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Empty
            icon={Inbox}
            title="Inbox zero"
            hint="When someone fills a form on your site it lands here in seconds. Try a test submission from the live site to confirm wiring."
          />
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] capitalize transition",
        active
          ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
          : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "tabular text-[10.5px]",
            active ? "opacity-70" : "text-[var(--color-fg-subtle)]",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
