/**
 * Send Lead + Purchase to Meta Test Events for Pixel 1000856715673214.
 *
 * Requires in studio/.env (or process env):
 *   META_CAPI_ACCESS_TOKEN=...
 *   META_TEST_EVENT_CODE=TESTxxxx   # from Events Manager → Test Events
 *   META_PIXEL_ID=1000856715673214  # optional, defaults
 *
 * Usage: npx tsx scripts/test-meta-capi.ts
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { sendMetaCapiEvent, metaCapiConfigured, metaPixelId } from "../src/lib/meta-capi";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  if (!metaCapiConfigured()) {
    console.error("Missing META_CAPI_ACCESS_TOKEN in studio/.env");
    process.exit(1);
  }
  if (!(process.env.META_TEST_EVENT_CODE ?? "").trim()) {
    console.error(
      "Missing META_TEST_EVENT_CODE — open Events Manager → Test Events and paste the code.",
    );
    process.exit(1);
  }

  const stamp = Date.now();
  const email = `capi-test+${stamp}@kingsbridgeimmigration.ca`;
  const pixel = metaPixelId();
  console.log("Pixel:", pixel);
  console.log("Test code:", process.env.META_TEST_EVENT_CODE);
  console.log("Email:", email);

  const lead = await sendMetaCapiEvent({
    eventName: "Lead",
    eventId: `lead_test_${stamp}`,
    eventSourceUrl: "https://kingsbridgeimmigration.ca/webinar",
    email,
    phone: "+14165550100",
    name: "CAPI Test Lead",
    ip: "203.0.113.10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    customData: {
      content_name: "webinar_registration",
      content_category: "webinar",
    },
  });
  console.log("Lead:", JSON.stringify(lead, null, 2));

  const purchase = await sendMetaCapiEvent({
    eventName: "Purchase",
    eventId: `purchase_test_${stamp}`,
    eventSourceUrl: "https://kingsbridgeimmigration.ca/webinar",
    email,
    phone: "+14165550100",
    name: "CAPI Test Lead",
    ip: "203.0.113.10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    customData: {
      value: 1,
      currency: "CAD",
      content_name: "webinar_seat",
      content_category: "webinar",
      content_type: "product",
      order_id: `test_order_${stamp}`,
    },
  });
  console.log("Purchase:", JSON.stringify(purchase, null, 2));

  if (!lead.ok || !purchase.ok) {
    process.exit(1);
  }
  if ("skipped" in lead && lead.skipped) {
    console.error("Lead skipped:", lead.skipped);
    process.exit(1);
  }
  console.log("\nCheck Meta Events Manager → Test Events for Lead + Purchase (server).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
