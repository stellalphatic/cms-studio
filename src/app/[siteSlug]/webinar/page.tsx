import Link from "next/link";
import { ArrowDownToLine, MonitorPlay } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { WebinarPaymentPill } from "@/components/ui/status-pill";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
import { cn, formatRelative } from "@/lib/utils";
import type { WebinarPaymentStatus, WebinarRegistration } from "@/lib/supabase/types";
import { WebinarFilterBar } from "./filter-bar";

export const metadata = { title: "Webinar registrations" };
export const dynamic = "force-dynamic";


const PAYMENT_STATUSES: WebinarPaymentStatus[] = ["unpaid", "paid", "refunded"];

export default async function WebinarRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteSlug: string }>;
  searchParams: Promise<{ status?: string; q?: string; variant?: string }>;
}) {
  const { siteSlug } = await params;
  const sp = await searchParams;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("webinar_registrations")
    .select(
      "id, name, email, whatsapp, source, landing_variant, payment_status, amount_cents, currency, paid_at, created_at, stripe_checkout_session_id, unpaid_reminder_status, paid_confirmation_status",
    )
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (sp.status && sp.status !== "all") q = q.eq("payment_status", sp.status);
  if (sp.variant) q = q.eq("landing_variant", sp.variant);

  const { data: rows } = await q;
  let registrations = (rows ?? []) as Pick<
    WebinarRegistration,
    | "id"
    | "name"
    | "email"
    | "whatsapp"
    | "source"
    | "landing_variant"
    | "payment_status"
    | "amount_cents"
    | "currency"
    | "paid_at"
    | "created_at"
    | "stripe_checkout_session_id"
    | "unpaid_reminder_status"
    | "paid_confirmation_status"
  >[];

  if (sp.q) {
    const needle = sp.q.toLowerCase();
    registrations = registrations.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.whatsapp.toLowerCase().includes(needle),
    );
  }

  const counts: Record<string, number> = { all: 0 };
  const { count: allCount } = await supabase
    .from("webinar_registrations")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site.id);
  counts.all = allCount ?? 0;

  await Promise.all(
    PAYMENT_STATUSES.map(async (s) => {
      const { count } = await supabase
        .from("webinar_registrations")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("payment_status", s);
      counts[s] = count ?? 0;
    }),
  );

  const exportParams = new URLSearchParams();
  if (sp.status) exportParams.set("status", sp.status);
  if (sp.q) exportParams.set("q", sp.q);
  if (sp.variant) exportParams.set("variant", sp.variant);

  return (
    <div>
      <PageHeader
        title="Webinar registrations"
        description="Every $1 seat reservation — unpaid until Stripe confirms payment."
        action={
          <a href={`/${siteSlug}/webinar/export?${exportParams.toString()}`}>
            <Button variant="secondary">
              <ArrowDownToLine className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total reservations" value={counts.all} />
        <StatCard label="Paid" value={counts.paid ?? 0} tone="good" />
        <StatCard label="Unpaid" value={counts.unpaid ?? 0} tone="warn" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        <FilterChip
          href={`/${siteSlug}/webinar`}
          label="All"
          count={counts.all}
          active={!sp.status || sp.status === "all"}
        />
        {PAYMENT_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/${siteSlug}/webinar?status=${s}`}
            label={s}
            count={counts[s] ?? 0}
            active={sp.status === s}
          />
        ))}
      </div>

      <WebinarFilterBar
        siteSlug={siteSlug}
        initialQ={sp.q ?? ""}
        initialVariant={sp.variant ?? ""}
      />

      {registrations.length > 0 ? (
        <DataTable>
          <THead>
            <TR>
              <TH>Registrant</TH>
              <TH>WhatsApp</TH>
              <TH>Variant</TH>
              <TH>Payment</TH>
              <TH>Emails</TH>
              <TH align="right">Reserved</TH>
            </TR>
          </THead>
          <TBody>
            {registrations.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Link
                    href={`/${siteSlug}/webinar/${r.id}`}
                    className="font-medium text-[var(--color-fg)] hover:underline"
                  >
                    {r.name}
                  </Link>
                  <div className="text-xs text-[var(--color-fg-muted)]">{r.email}</div>
                </TD>
                <TD mono muted>
                  {r.whatsapp}
                </TD>
                <TD muted>
                  {r.landing_variant ?? r.source ?? "—"}
                </TD>
                <TD>
                  <WebinarPaymentPill status={r.payment_status} />
                  {r.payment_status === "paid" && r.amount_cents != null && (
                    <div className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                      {(r.amount_cents / 100).toFixed(2)}{" "}
                      {(r.currency ?? "cad").toUpperCase()}
                    </div>
                  )}
                </TD>
                <TD muted>
                  <div className="text-[11px] leading-5">
                    <div>
                      Pay reminder:{" "}
                      <span className="font-medium text-[var(--color-fg)]">
                        {r.unpaid_reminder_status ?? "—"}
                      </span>
                    </div>
                    <div>
                      Zoom confirm:{" "}
                      <span className="font-medium text-[var(--color-fg)]">
                        {r.paid_confirmation_status ?? "—"}
                      </span>
                    </div>
                  </div>
                </TD>
                <TD align="right" muted mono>
                  {formatRelative(r.created_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Empty
            icon={MonitorPlay}
            title="No webinar registrations yet"
            hint="When someone clicks Reserve on /webinar or /shabbeers-webinar, they appear here as unpaid until Stripe confirms payment."
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone === "good" && "text-emerald-600",
          tone === "warn" && "text-amber-600",
        )}
      >
        {value}
      </div>
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
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition",
        active
          ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
          : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className={cn("font-mono text-[10px]", active ? "opacity-80" : "opacity-60")}>
          {count}
        </span>
      )}
    </Link>
  );
}
