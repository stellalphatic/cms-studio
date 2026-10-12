"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
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
    .select("id, payment_status, form_submission_id")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<{
      id: string;
      payment_status: WebinarPaymentStatus;
      form_submission_id: string | null;
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
