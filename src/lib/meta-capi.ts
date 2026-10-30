/**
 * Meta Conversions API (CAPI) for Kingsbridge.
 * Always targets BOTH Pixel IDs (new ads + legacy) — no Vercel env change required.
 * Purchase on Stripe paid. Browser Pixel dual-inits the same two IDs on the public site.
 */

import { createHash } from "node:crypto";

/** New ads account Pixel. */
export const META_PIXEL_ID_PRIMARY = "2614243202349882";
/** Legacy ads Pixel — keep receiving CAPI + browser events. */
export const META_PIXEL_ID_LEGACY = "1000856715673214";

/** Both Pixels, always. Env META_PIXEL_ID is optional and only adds an extra ID. */
export const DEFAULT_META_PIXEL_IDS: readonly string[] = [
  META_PIXEL_ID_PRIMARY,
  META_PIXEL_ID_LEGACY,
];

/** @deprecated Prefer META_PIXEL_ID_PRIMARY — kept for older imports. */
export const DEFAULT_META_PIXEL_ID = META_PIXEL_ID_PRIMARY;

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
  | { ok: true; events_received: number; fbtrace_id?: string; skipped?: never; pixel_ids?: string[] }
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

/** Pixel IDs that receive every CAPI event (both hardcoded; env can add one more). */
export function metaPixelIds(): string[] {
  const ids = new Set<string>(DEFAULT_META_PIXEL_IDS);
  const fromEnv = (process.env.META_PIXEL_ID ?? "").trim();
  if (fromEnv) ids.add(fromEnv);
  return Array.from(ids);
}

/** Primary Pixel for display / scripts. */
export function metaPixelId(): string {
  return metaPixelIds()[0] ?? META_PIXEL_ID_PRIMARY;
}

export function metaCapiConfigured(): boolean {
  return Boolean((process.env.META_CAPI_ACCESS_TOKEN ?? "").trim());
}

function testEventCode(): string | undefined {
  const code = (process.env.META_TEST_EVENT_CODE ?? "").trim();
  return code || undefined;
}

async function postToPixel(
  pixelId: string,
  token: string,
  body: Record<string, unknown>,
  eventName: string,
): Promise<MetaCapiResult> {
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
      console.error("[meta-capi]", eventName, pixelId, res.status, text.slice(0, 500));
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
      pixel_ids: [pixelId],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    console.error("[meta-capi]", eventName, pixelId, message);
    return { ok: false, error: message };
  }
}

/**
 * Sends the event to every configured Pixel ID in parallel.
 * Succeeds if at least one Pixel accepts the event (so a token scoped to
 * only one ads account still keeps that Pixel working).
 */
export async function sendMetaCapiEvent(input: MetaCapiEventInput): Promise<MetaCapiResult> {
  const token = (process.env.META_CAPI_ACCESS_TOKEN ?? "").trim();
  if (!token) {
    return { ok: true, skipped: "meta_capi_not_configured" };
  }

  const pixelIds = metaPixelIds();
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

  const results = await Promise.all(
    pixelIds.map((pixelId) => postToPixel(pixelId, token, body, input.eventName)),
  );

  const successes = results.filter((r): r is Extract<MetaCapiResult, { ok: true; events_received: number }> =>
    r.ok && !("skipped" in r && r.skipped),
  );
  const failures = results.filter((r) => !r.ok);

  if (successes.length === 0) {
    const first = failures[0];
    return first ?? { ok: false, error: "all_pixels_failed" };
  }

  for (const fail of failures) {
    if (!fail.ok) {
      console.error(
        "[meta-capi] partial failure",
        input.eventName,
        input.eventId,
        fail.error,
      );
    }
  }

  return {
    ok: true,
    events_received: successes.reduce((sum, r) => sum + (r.events_received ?? 0), 0),
    fbtrace_id: successes[0]?.fbtrace_id,
    pixel_ids: successes.flatMap((r) => r.pixel_ids ?? []),
  };
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
