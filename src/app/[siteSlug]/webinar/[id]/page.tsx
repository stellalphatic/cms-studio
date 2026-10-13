import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { WebinarPaymentPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/utils";
import { buildWebinarPaymentUrl } from "@/lib/webinar";
import type { WebinarRegistration } from "@/lib/supabase/types";
import { WebinarNotesEditor } from "./notes-editor";

export const metadata = { title: "Webinar registration" };
export const dynamic = "force-dynamic";


export default async function WebinarRegistrationDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("webinar_registrations")
    .select("*")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<WebinarRegistration>();

  if (!row) notFound();

  const paymentUrl =
    row.payment_status === "unpaid"
      ? buildWebinarPaymentUrl(row.id, row.email)
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Link
          href={`/${siteSlug}/webinar`}
          className="mb-3 inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" /> Back to webinar
        </Link>
        <PageHeader
          title={row.name}
          description={`Reserved ${formatDate(row.created_at, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`}
          action={<WebinarPaymentPill status={row.payment_status} />}
        />

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
            <FieldRow label="Email">
              <a className="underline" href={`mailto:${row.email}`}>
                {row.email}
              </a>
            </FieldRow>
            <FieldRow label="WhatsApp">
              <a
                className="underline"
                href={`https://wa.me/${row.whatsapp.replace(/[^\d+]/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                {row.whatsapp}
              </a>
            </FieldRow>
            <FieldRow label="Landing variant">{row.landing_variant ?? "—"}</FieldRow>
            <FieldRow label="Source">{row.source ?? "—"}</FieldRow>
            <FieldRow label="Payment status">
              <WebinarPaymentPill status={row.payment_status} />
            </FieldRow>
            <FieldRow label="Pay reminder email">
              <span className="capitalize">{row.unpaid_reminder_status ?? "—"}</span>
              {row.unpaid_reminder_sent_at && (
                <span className="ml-2 text-xs text-[var(--color-fg-muted)]">
                  {formatDate(row.unpaid_reminder_sent_at, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {row.unpaid_reminder_error && (
                <div className="mt-1 text-xs text-amber-700">{row.unpaid_reminder_error}</div>
              )}
            </FieldRow>
            <FieldRow label="Zoom confirm email">
              <span className="capitalize">{row.paid_confirmation_status ?? "—"}</span>
              {row.paid_confirmation_sent_at && (
                <span className="ml-2 text-xs text-[var(--color-fg-muted)]">
                  {formatDate(row.paid_confirmation_sent_at, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {row.paid_confirmation_error && (
                <div className="mt-1 text-xs text-amber-700">{row.paid_confirmation_error}</div>
              )}
            </FieldRow>
            {row.paid_at && (
              <FieldRow label="Paid at">
                {formatDate(row.paid_at, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </FieldRow>
            )}
            {row.amount_cents != null && (
              <FieldRow label="Amount">
                {(row.amount_cents / 100).toFixed(2)}{" "}
                {(row.currency ?? "cad").toUpperCase()}
              </FieldRow>
            )}
            {row.stripe_customer_email && (
              <FieldRow label="Stripe email">{row.stripe_customer_email}</FieldRow>
            )}
            {row.stripe_checkout_session_id && (
              <FieldRow label="Checkout session">
                <span className="break-all font-mono text-xs">
                  {row.stripe_checkout_session_id}
                </span>
              </FieldRow>
            )}
            {row.stripe_payment_intent_id && (
              <FieldRow label="Payment intent">
                <span className="break-all font-mono text-xs">
                  {row.stripe_payment_intent_id}
                </span>
              </FieldRow>
            )}
            {row.source_url && (
              <FieldRow label="Source URL">
                <a className="underline" href={row.source_url} target="_blank" rel="noreferrer">
                  {row.source_url}
                </a>
              </FieldRow>
            )}
            {row.form_submission_id && (
              <FieldRow label="Form submission">
                <Link
                  className="underline"
                  href={`/${siteSlug}/forms/${row.form_submission_id}`}
                >
                  Open in Submissions
                </Link>
              </FieldRow>
            )}
            {row.ip_address && <FieldRow label="IP">{row.ip_address}</FieldRow>}
            {row.user_agent && <FieldRow label="User agent">{row.user_agent}</FieldRow>}
            <FieldRow label="Registration ID">
              <span className="break-all font-mono text-xs">{row.id}</span>
            </FieldRow>
          </dl>

          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-medium hover:bg-[var(--color-surface)]"
            >
              Open unpaid payment link
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <WebinarNotesEditor
        siteSlug={siteSlug}
        id={row.id}
        initialNotes={row.notes ?? ""}
        paymentStatus={row.payment_status}
        unpaidReminderStatus={row.unpaid_reminder_status ?? "pending"}
        paidConfirmationStatus={row.paid_confirmation_status ?? "pending"}
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
