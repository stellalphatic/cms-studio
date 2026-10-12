import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  paymentIntentId,
  verifyStripeSignature,
  type StripeWebhookEvent,
} from "@/lib/stripe-webhook";
import {
  markWebinarRegistrationPaid,
  markWebinarRegistrationRefunded,
} from "@/lib/webinar-register";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook endpoint.
 *
 * Configure in Stripe Dashboard → Developers → Webhooks:
 *   URL:  https://<cms-host>/api/v1/webhooks/stripe
 *   Events: checkout.session.completed, charge.refunded
 *   Signing secret → STRIPE_WEBHOOK_SECRET env var
 *
 * Payment Link must pass ?client_reference_id=<webinar_registrations.id>
 * (the public form redirect already does this).
 */
export async function POST(req: NextRequest) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const verified = verifyStripeSignature(rawBody, signature, secret);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sb = createSupabaseAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const registrationId = (session.client_reference_id ?? "").trim();
    if (!registrationId) {
      // Not a webinar payment (or misconfigured link) — acknowledge so Stripe
      // does not retry forever.
      return NextResponse.json({ ok: true, ignored: "missing_client_reference_id" });
    }

    const result = await markWebinarRegistrationPaid({
      sb,
      registrationId,
      checkoutSessionId: session.id,
      paymentIntentId: paymentIntentId(session),
      customerEmail:
        session.customer_details?.email ?? session.customer_email ?? null,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
    });

    if (!result.ok) {
      // registration_not_found → 200 so Stripe stops; other errors → 500 retry
      if (result.error === "registration_not_found") {
        return NextResponse.json({ ok: true, ignored: result.error });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      registration_id: registrationId,
      already: Boolean(result.already),
    });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as { payment_intent?: string | null };
    const pi =
      typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (!pi) {
      return NextResponse.json({ ok: true, ignored: "missing_payment_intent" });
    }
    const result = await markWebinarRegistrationRefunded({
      sb,
      paymentIntentId: pi,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, updated: result.updated });
  }

  return NextResponse.json({ ok: true, ignored: event.type });
}
