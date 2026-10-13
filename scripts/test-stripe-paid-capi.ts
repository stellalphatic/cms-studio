/**
 * Simulate Stripe checkout.session.completed → unpaid→paid → Meta CAPI Purchase.
 * Uses the same markWebinarRegistrationPaid path as the live webhook (no live charge).
 *
 * Requires studio/.env:
 *   META_CAPI_ACCESS_TOKEN, META_TEST_EVENT_CODE, SUPABASE_*
 *
 * Usage: npx tsx scripts/test-stripe-paid-capi.ts
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { markWebinarRegistrationPaid } from "../src/lib/webinar-register";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!process.env.META_CAPI_ACCESS_TOKEN?.trim()) {
    console.error("Missing META_CAPI_ACCESS_TOKEN");
    process.exit(1);
  }
  if (!testCode) {
    console.error("Missing META_TEST_EVENT_CODE (needed for Test Events)");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const stamp = Date.now();
  const email = `stripe-test+${stamp}@example.com`;

  const { data: site } = await sb
    .from("sites")
    .select("id")
    .eq("slug", "kingsbridge")
    .maybeSingle<{ id: string }>();
  if (!site?.id) {
    console.error("kingsbridge site not found");
    process.exit(1);
  }

  const { data: row, error } = await sb
    .from("webinar_registrations")
    .insert({
      site_id: site.id,
      name: "Stripe Test Purchase",
      email,
      whatsapp: "+14165550100",
      landing_variant: "short",
      payment_status: "unpaid",
      source_url: "https://kingsbridgeimmigration.ca/webinar",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !row) {
    console.error("insert failed", error?.message);
    process.exit(1);
  }

  const sessionId = `cs_test_meta_${stamp}`;
  const result = await markWebinarRegistrationPaid({
    sb: sb as never,
    registrationId: row.id,
    checkoutSessionId: sessionId,
    paymentIntentId: `pi_test_meta_${stamp}`,
    customerEmail: email,
    amountCents: 100,
    currency: "cad",
  });

  console.log("registration_id:", row.id);
  console.log("test_event_code:", testCode);
  console.log("mark_paid:", result);
  console.log(
    "\nCheck Events Manager → Test Events for Purchase (Server) within ~60s.",
  );
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
