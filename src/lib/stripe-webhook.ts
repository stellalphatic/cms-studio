import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a Stripe webhook signature without pulling in the full Stripe SDK.
 * https://docs.stripe.com/webhooks/signatures
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): { ok: true } | { ok: false; error: string } {
  if (!signatureHeader) return { ok: false, error: "missing_signature" };
  if (!secret) return { ok: false, error: "missing_secret" };

  const parts = signatureHeader.split(",").map((p) => p.trim());
  let timestamp = "";
  const v1Signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v ?? "";
    if (k === "v1" && v) v1Signatures.push(v);
  }

  if (!timestamp || !v1Signatures.length) {
    return { ok: false, error: "malformed_signature" };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, error: "timestamp_out_of_tolerance" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const match = v1Signatures.some((sig) => {
    const got = Buffer.from(sig, "utf8");
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
  });

  return match ? { ok: true } : { ok: false, error: "signature_mismatch" };
}

export type StripeCheckoutSession = {
  id: string;
  client_reference_id?: string | null;
  payment_intent?: string | { id?: string } | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: { object: StripeCheckoutSession & Record<string, unknown> };
};

export function paymentIntentId(
  session: StripeCheckoutSession,
): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  if (typeof pi === "string") return pi;
  return pi.id ?? null;
}
