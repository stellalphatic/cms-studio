"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { voidMetaCapiEvent } from "@/lib/meta-capi";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  onWebinarMarkedPaid,
  sendUnpaidReminderForRegistration,
} from "@/lib/webinar-emails";
import type { WebinarPaymentStatus } from "@/lib/webinar";

function revalidateWebinar(siteSlug: string, id: string) {
  revalidatePath(`/${siteSlug}`);
  revalidatePath(`/${siteSlug}/webinar`);
  revalidatePath(`/${siteSlug}/webinar/${id}`);
}

export async function updateWebinarNotes(
  siteSlug: string,
  id: string,
  notes: string,
) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("webinar_registrations")
    .update({ notes })
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "webinar_registrations",
    entity_id: id,
    diff: { notes },
  });

  revalidateWebinar(siteSlug, id);
}

/** Manual override when Stripe webhook did not mark the seat (or for refunds). */
export async function setWebinarPaymentStatus(
  siteSlug: string,
  id: string,
  paymentStatus: WebinarPaymentStatus,
) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: row, error: fetchErr } = await supabase
    .from("webinar_registrations")
    .select(
      "id, name, email, whatsapp, payment_status, form_submission_id, amount_cents, currency, source_url, ip_address, user_agent, stripe_checkout_session_id",
    )
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<{
      id: string;
      name: string;
      email: string;
      whatsapp: string;
      payment_status: WebinarPaymentStatus;
      form_submission_id: string | null;
      amount_cents: number | null;
      currency: string | null;
      source_url: string | null;
      ip_address: string | null;
      user_agent: string | null;
      stripe_checkout_session_id: string | null;
    }>();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Registration not found");

  const paidAt =
    paymentStatus === "paid" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("webinar_registrations")
    .update({
      payment_status: paymentStatus,
      paid_at: paymentStatus === "paid" ? paidAt : null,
    })
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);

  if (row.form_submission_id) {
    const { data: submission } = await supabase
      .from("form_submissions")
      .select("payload")
      .eq("id", row.form_submission_id)
      .maybeSingle<{ payload: Record<string, unknown> }>();
    if (submission) {
      await supabase
        .from("form_submissions")
        .update({
          payload: {
            ...(submission.payload ?? {}),
            payment_status: paymentStatus,
            ...(paymentStatus === "paid" && paidAt ? { paid_at: paidAt } : {}),
          },
          ...(paymentStatus === "paid" ? { status: "contacted" } : {}),
        })
        .eq("id", row.form_submission_id);
    }
  }

  if (paymentStatus === "paid" && row.payment_status !== "paid") {
    const currency = (row.currency ?? "cad").toUpperCase();
    const value =
      typeof row.amount_cents === "number" && Number.isFinite(row.amount_cents)
        ? row.amount_cents / 100
        : 1;
    voidMetaCapiEvent({
      eventName: "Purchase",
      eventId: `purchase_${row.id}`,
      eventSourceUrl: row.source_url ?? "https://kingsbridgeimmigration.ca/webinar",
      email: row.email,
      phone: row.whatsapp,
      name: row.name,
      ip: row.ip_address,
      userAgent: row.user_agent,
      externalId: row.id,
      customData: {
        value,
        currency,
        content_name: "webinar_seat",
        content_category: "webinar",
        content_ids: [row.id],
        content_type: "product",
        order_id: row.stripe_checkout_session_id ?? row.id,
      },
    });
    void onWebinarMarkedPaid({
      sb: createSupabaseAdminClient(),
      registrationId: id,
    }).catch((err) => {
      console.error("[webinar-emails] manual paid confirmation failed", id, err);
    });
  }

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "webinar_registrations",
    entity_id: id,
    diff: {
      payment_status: { from: row.payment_status, to: paymentStatus },
      source: "manual_cms",
    },
  });

  revalidateWebinar(siteSlug, id);
}

/** Retry unpaid payment reminder (resets to pending then sends now). */
export async function retryUnpaidReminderEmail(siteSlug: string, id: string) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const admin = createSupabaseAdminClient();

  const { data: row } = await admin
    .from("webinar_registrations")
    .select("id, payment_status")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<{ id: string; payment_status: WebinarPaymentStatus }>();
  if (!row) throw new Error("Registration not found");
  if (row.payment_status !== "unpaid") {
    throw new Error("Lead is already paid; unpaid reminder is skipped");
  }

  await admin
    .from("webinar_registrations")
    .update({
      unpaid_reminder_status: "pending",
      unpaid_reminder_due_at: new Date().toISOString(),
      unpaid_reminder_error: null,
    })
    .eq("id", id);

  const result = await sendUnpaidReminderForRegistration(admin, id);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "webinar_registrations",
    entity_id: id,
    diff: { unpaid_reminder_retry: result },
  });

  revalidateWebinar(siteSlug, id);
  if (result === "failed") {
    throw new Error("Reminder email failed — see error on this page");
  }
}

/** Retry Zoom confirmation after a failed send (paid leads only). */
export async function retryPaidConfirmationEmail(siteSlug: string, id: string) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const admin = createSupabaseAdminClient();

  const { data: row } = await admin
    .from("webinar_registrations")
    .select("id, payment_status")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<{ id: string; payment_status: WebinarPaymentStatus }>();
  if (!row) throw new Error("Registration not found");
  if (row.payment_status !== "paid") {
    throw new Error("Lead must be paid before sending Zoom confirmation");
  }

  await admin
    .from("webinar_registrations")
    .update({
      paid_confirmation_status: "pending",
      paid_confirmation_error: null,
    })
    .eq("id", id)
    .neq("paid_confirmation_status", "sent");

  await onWebinarMarkedPaid({ sb: admin, registrationId: id });

  const { data: after } = await admin
    .from("webinar_registrations")
    .select("paid_confirmation_status, paid_confirmation_error")
    .eq("id", id)
    .maybeSingle<{
      paid_confirmation_status: string;
      paid_confirmation_error: string | null;
    }>();

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "webinar_registrations",
    entity_id: id,
    diff: { paid_confirmation_retry: after?.paid_confirmation_status },
  });

  revalidateWebinar(siteSlug, id);
  if (after?.paid_confirmation_status === "failed") {
    throw new Error(after.paid_confirmation_error ?? "Confirmation email failed");
  }
}
