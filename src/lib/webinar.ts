/**
 * Kingsbridge $1 webinar registration helpers.
 *
 * Flow:
 *  1. Public site POSTs webinar_registration → CMS creates unpaid row
 *  2. CMS returns a Stripe Payment Link URL with client_reference_id=<row.id>
 *  3. Stripe webhook marks the row paid on checkout.session.completed
 */

export const DEFAULT_WEBINAR_STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/4gMdR9fu1a1XfrN6vB3Je09";

export type WebinarPaymentStatus = "unpaid" | "paid" | "refunded";

export function webinarPaymentLinkBase(): string {
  const fromEnv = (process.env.WEBINAR_STRIPE_PAYMENT_LINK ?? "").trim();
  return (fromEnv || DEFAULT_WEBINAR_STRIPE_PAYMENT_LINK).replace(/\/$/, "");
}

/** Build the Payment Link URL that ties Stripe checkout back to our row. */
export function buildWebinarPaymentUrl(registrationId: string, email: string): string {
  const url = new URL(webinarPaymentLinkBase());
  url.searchParams.set("client_reference_id", registrationId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
