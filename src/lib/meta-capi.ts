/**
 * Meta Conversions API (CAPI) for Kingsbridge Pixel 1000856715673214.
 * Server-side Lead (form save) + Purchase (Stripe paid). Does not touch Pixel install.
 */

import { createHash } from "node:crypto";

export const DEFAULT_META_PIXEL_ID = "1000856715673214";

type MetaUserData = {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
  external_id?: string[];
};

type MetaCustomData = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  order_id?: string;
};

export type MetaCapiEventInput = {
  eventName: "Lead" | "Purchase";
  eventId: string;
  eventSourceUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
  customData?: MetaCustomData;
  /** Unix seconds; defaults to now. */
  eventTime?: number;
};

export type MetaCapiResult =
  | { ok: true; events_received: number; fbtrace_id?: string; skipped?: never }
  | { ok: true; skipped: string }
  | { ok: false; error: string; status?: number; body?: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Digits only; keep leading country code if present. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashIfPresent(value: string | null | undefined, normalize: (v: string) => string): string[] | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  const normalized = normalize(raw);
  if (!normalized) return undefined;
  return [sha256(normalized)];
}

function splitName(name: string | null | undefined): { fn?: string[]; ln?: string[] } {
  const raw = (name ?? "").trim().toLowerCase();
  if (!raw) return {};
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const fn = [sha256(parts[0]!)];
  if (parts.length === 1) return { fn };
  return { fn, ln: [sha256(parts[parts.length - 1]!)] };
}

export function metaPixelId(): string {
  return (process.env.META_PIXEL_ID ?? DEFAULT_META_PIXEL_ID).trim() || DEFAULT_META_PIXEL_ID;
}

export function metaCapiConfigured(): boolean {
  return Boolean((process.env.META_CAPI_ACCESS_TOKEN ?? "").trim());
}

function testEventCode(): string | undefined {
  const code = (process.env.META_TEST_EVENT_CODE ?? "").trim();
  return code || undefined;
}

export async function sendMetaCapiEvent(input: MetaCapiEventInput): Promise<MetaCapiResult> {
  const token = (process.env.META_CAPI_ACCESS_TOKEN ?? "").trim();
  if (!token) {
    return { ok: true, skipped: "meta_capi_not_configured" };
  }

  const pixelId = metaPixelId();
  const { fn, ln } = splitName(input.name);
  const userData: MetaUserData = {
    em: hashIfPresent(input.email, normalizeEmail),
    ph: hashIfPresent(input.phone, normalizePhone),
    fn,
    ln,
  };
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp?.trim()) userData.fbp = input.fbp.trim();
  if (input.fbc?.trim()) userData.fbc = input.fbc.trim();
  if (input.externalId?.trim()) {
    userData.external_id = [sha256(input.externalId.trim().toLowerCase())];
  }

  const event = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website" as const,
    event_source_url:
      input.eventSourceUrl?.trim() ||
      "https://kingsbridgeimmigration.ca/webinar",
    user_data: userData,
    ...(input.customData ? { custom_data: input.customData } : {}),
  };

  const body: Record<string, unknown> = {
    data: [event],
  };
  const testCode = testEventCode();
  if (testCode) body.test_event_code = testCode;

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: { events_received?: number; fbtrace_id?: string; error?: { message?: string } } = {};
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      // keep raw text
    }

    if (!res.ok) {
      console.error("[meta-capi]", input.eventName, res.status, text.slice(0, 500));
      return {
        ok: false,
        error: parsed.error?.message ?? `http_${res.status}`,
        status: res.status,
        body: text.slice(0, 800),
      };
    }

    return {
      ok: true,
      events_received: parsed.events_received ?? 0,
      fbtrace_id: parsed.fbtrace_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    console.error("[meta-capi]", input.eventName, message);
    return { ok: false, error: message };
  }
}

/** Fire-and-forget wrapper — never throws into the request path. */
export function voidMetaCapiEvent(input: MetaCapiEventInput): void {
  void sendMetaCapiEvent(input).then((result) => {
    if (!result.ok) {
      console.error("[meta-capi] failed", input.eventName, input.eventId, result.error);
    } else if ("skipped" in result && result.skipped) {
      // Token not set — silent in prod until configured.
    }
  });
}
