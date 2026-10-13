"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { voidMetaCapiEvent } from "@/lib/meta-capi";
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
