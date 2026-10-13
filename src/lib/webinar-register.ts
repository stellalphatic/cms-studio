import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import { voidMetaCapiEvent } from "@/lib/meta-capi";
import {
  onWebinarMarkedPaid,
  onWebinarUnpaidCreated,
} from "@/lib/webinar-emails";
import {
  buildWebinarPaymentUrl,
  isValidEmail,
  type WebinarPaymentStatus,
} from "@/lib/webinar";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type WebinarRegisterResult =
  | {
      ok: true;
      registration_id: string;
      payment_status: WebinarPaymentStatus;
      payment_url: string;
    }
  | { ok: false; error: string; status: number };

/**
 * Creates (or reuses unpaid) webinar registration after a form_submissions insert.
 * Returns the Stripe Payment Link the client should redirect to.
 */
export async function upsertUnpaidWebinarRegistration(args: {
  sb: AdminClient;
  siteId: string;
  formSubmissionId: string;
  payload: Record<string, unknown>;
  sourceUrl: string | null;
  ip: string | null;
  userAgent: string | null;
}): Promise<WebinarRegisterResult> {
  const name = String(args.payload.name ?? "").trim();
  const email = String(args.payload.email ?? "")
    .trim()
    .toLowerCase();
  const whatsapp = String(args.payload.whatsapp ?? "").trim();
  const source = String(args.payload.source ?? "").trim() || null;
  const landingVariant = String(args.payload.landing_variant ?? "").trim() || null;

  if (!name || !email || !whatsapp) {
    return { ok: false, error: "missing_fields", status: 400 };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "invalid_email", status: 400 };
  }

  const { data: existing } = await args.sb
    .from("webinar_registrations")
    .select("id")
    .eq("site_id", args.siteId)
    .eq("email", email)
    .eq("payment_status", "unpaid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  let registrationId: string;

  if (existing?.id) {
    const { error } = await args.sb
      .from("webinar_registrations")
      .update({
        name,
        whatsapp,
        source,
        landing_variant: landingVariant,
        form_submission_id: args.formSubmissionId,
        source_url: args.sourceUrl,
        ip_address: args.ip,
        user_agent: args.userAgent,
      })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }
    registrationId = existing.id;
  } else {
    const { data: created, error } = await args.sb
      .from("webinar_registrations")
      .insert({
        site_id: args.siteId,
        form_submission_id: args.formSubmissionId,
        name,
        email,
        whatsapp,
        source,
        landing_variant: landingVariant,
        payment_status: "unpaid",
        source_url: args.sourceUrl,
        ip_address: args.ip,
        user_agent: args.userAgent,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !created) {
      return { ok: false, error: error?.message ?? "insert_failed", status: 500 };
    }
    registrationId = created.id;
  }

  // Mirror payment fields onto the form_submissions payload so the generic
  // Submissions inbox shows unpaid/paid without a separate join.
  const enrichedPayload = {
    ...args.payload,
    name,
    email,
    whatsapp,
    registration_id: registrationId,
    payment_status: "unpaid" as const,
  };
  await args.sb
    .from("form_submissions")
    .update({ payload: enrichedPayload })
    .eq("id", args.formSubmissionId);

  // Schedule unpaid payment reminder (+ Brevo Leads sync). Fire-and-forget.
  void onWebinarUnpaidCreated({
    sb: args.sb,
    registrationId,
  }).catch((err) => {
    console.error("[webinar-emails] unpaid schedule failed", registrationId, err);
  });

  return {
    ok: true,
    registration_id: registrationId,
    payment_status: "unpaid",
    payment_url: buildWebinarPaymentUrl(registrationId, email),
  };
}

/**
 * Resolve which unpaid (or any) registration a Stripe checkout belongs to.
 * Prefer client_reference_id; fall back to the newest unpaid row for the
 * payer email (covers Payment Links opened without the query param).
 */
export async function resolveWebinarRegistrationId(args: {
  sb: AdminClient;
  registrationId: string | null;
  customerEmail: string | null;
}): Promise<string | null> {
  const explicit = (args.registrationId ?? "").trim();
  if (explicit) {
    const { data } = await args.sb
      .from("webinar_registrations")
      .select("id")
      .eq("id", explicit)
      .maybeSingle<{ id: string }>();
    if (data?.id) return data.id;
  }

  const email = (args.customerEmail ?? "").trim().toLowerCase();
  if (!email) return null;

  const { data: unpaid } = await args.sb
    .from("webinar_registrations")
    .select("id")
    .eq("email", email)
    .eq("payment_status", "unpaid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (unpaid?.id) return unpaid.id;

  const { data: anyRow } = await args.sb
    .from("webinar_registrations")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return anyRow?.id ?? null;
}

/** Mark a registration paid from a verified Stripe checkout session. */
export async function markWebinarRegistrationPaid(args: {
  sb: AdminClient;
  registrationId: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  customerEmail: string | null;
  amountCents: number | null;
  currency: string | null;
}): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const { data: row, error: fetchErr } = await args.sb
    .from("webinar_registrations")
    .select(
      "id, name, email, whatsapp, payment_status, form_submission_id, site_id, source_url, ip_address, user_agent",
    )
    .eq("id", args.registrationId)
    .maybeSingle<{
      id: string;
      name: string;
      email: string;
      whatsapp: string;
      payment_status: WebinarPaymentStatus;
      form_submission_id: string | null;
      site_id: string;
      source_url: string | null;
      ip_address: string | null;
      user_agent: string | null;
    }>();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!row) return { ok: false, error: "registration_not_found" };

  if (row.payment_status === "paid") {
    // Idempotent: still attach session ids if missing.
    await args.sb
      .from("webinar_registrations")
      .update({
        stripe_checkout_session_id: args.checkoutSessionId,
        stripe_payment_intent_id: args.paymentIntentId,
        stripe_customer_email: args.customerEmail,
      })
      .eq("id", row.id)
      .is("stripe_checkout_session_id", null);
    return { ok: true, already: true };
  }

  const paidAt = new Date().toISOString();
  const currency = args.currency?.toLowerCase() ?? "cad";
  const amountCents = args.amountCents;
  const { error: updateErr } = await args.sb
    .from("webinar_registrations")
    .update({
      payment_status: "paid",
      paid_at: paidAt,
      stripe_checkout_session_id: args.checkoutSessionId,
      stripe_payment_intent_id: args.paymentIntentId,
      stripe_customer_email: args.customerEmail,
      amount_cents: amountCents,
      currency,
    })
    .eq("id", row.id);

  if (updateErr) return { ok: false, error: updateErr.message };

  if (row.form_submission_id) {
    const { data: submission } = await args.sb
      .from("form_submissions")
      .select("payload")
      .eq("id", row.form_submission_id)
      .maybeSingle<{ payload: Record<string, unknown> }>();

    if (submission) {
      await args.sb
        .from("form_submissions")
        .update({
          payload: {
            ...(submission.payload ?? {}),
            payment_status: "paid",
            registration_id: row.id,
            paid_at: paidAt,
            stripe_checkout_session_id: args.checkoutSessionId,
          },
          status: "contacted",
        })
        .eq("id", row.form_submission_id);
    }
  }

  // Meta CAPI Purchase — only on unpaid → paid (Stripe webhook / confirmed pay).
  const value =
    typeof amountCents === "number" && Number.isFinite(amountCents)
      ? amountCents / 100
      : 1;
  voidMetaCapiEvent({
    eventName: "Purchase",
    eventId: `purchase_${row.id}`,
    eventSourceUrl: row.source_url ?? "https://kingsbridgeimmigration.ca/webinar",
    email: args.customerEmail ?? row.email,
    phone: row.whatsapp,
    name: row.name,
    ip: row.ip_address,
    userAgent: row.user_agent,
    externalId: row.id,
    customData: {
      value,
      currency: currency.toUpperCase(),
      content_name: "webinar_seat",
      content_category: "webinar",
      content_ids: [row.id],
      content_type: "product",
      order_id: args.checkoutSessionId,
    },
  });

  // Zoom confirmation email (idempotent). Fire-and-forget.
  void onWebinarMarkedPaid({
    sb: args.sb,
    registrationId: row.id,
  }).catch((err) => {
    console.error("[webinar-emails] paid confirmation failed", row.id, err);
  });

  return { ok: true };
}

export async function markWebinarRegistrationRefunded(args: {
  sb: AdminClient;
  paymentIntentId: string;
}): Promise<{ ok: true; updated: boolean } | { ok: false; error: string }> {
  const { data: row, error } = await args.sb
    .from("webinar_registrations")
    .select("id, form_submission_id")
    .eq("stripe_payment_intent_id", args.paymentIntentId)
    .maybeSingle<{ id: string; form_submission_id: string | null }>();

  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: true, updated: false };

  await args.sb
    .from("webinar_registrations")
    .update({ payment_status: "refunded" })
    .eq("id", row.id);

  if (row.form_submission_id) {
    const { data: submission } = await args.sb
      .from("form_submissions")
      .select("payload")
      .eq("id", row.form_submission_id)
      .maybeSingle<{ payload: Record<string, unknown> }>();
    if (submission) {
      await args.sb
        .from("form_submissions")
        .update({
          payload: {
            ...(submission.payload ?? {}),
            payment_status: "refunded",
          },
        })
        .eq("id", row.form_submission_id);
    }
  }

  return { ok: true, updated: true };
}
