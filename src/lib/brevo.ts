/**
 * Brevo helpers — transactional email + contact sync via REST API.
 * Use the Brevo API key (xkeysib-…), not the SMTP key, for these endpoints.
 */

import type { ResolvedWebinarMailConfig } from "@/lib/webinar-mail-config";

const BREVO_API = "https://api.brevo.com/v3";

export type BrevoContactAttrs = {
  FIRSTNAME?: string;
  CMS_LEAD_ID?: string;
  PAYMENT_STATUS?: string;
  PAYMENT_URL?: string;
  WEBINAR_DATE?: string;
  LOCAL_TIME?: string;
  ZOOM_LINK?: string;
  WEBINAR_TIMEZONE?: string;
};

export type BrevoSendResult =
  | { ok: true; messageId?: string; via: "api" }
  | { ok: false; error: string };

export type BrevoContactResult =
  | { ok: true; id?: string | number }
  | { ok: false; error: string };

async function brevoFetch(
  apiKey: string,
  path: string,
  init: RequestInit,
): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const res = await fetch(`${BREVO_API}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  return { status: res.status, json, text };
}

export async function upsertBrevoContact(args: {
  cfg: ResolvedWebinarMailConfig;
  email: string;
  attributes: BrevoContactAttrs;
  listIds?: number[];
  unlinkListIds?: number[];
}): Promise<BrevoContactResult> {
  if (!args.cfg.apiKey) {
    return { ok: false, error: "brevo_api_key_missing" };
  }

  const body: Record<string, unknown> = {
    email: args.email.trim().toLowerCase(),
    attributes: args.attributes,
    updateEnabled: true,
  };
  if (args.listIds?.length) body.listIds = args.listIds;
  if (args.unlinkListIds?.length) body.unlinkListIds = args.unlinkListIds;

  const { status, json, text } = await brevoFetch(args.cfg.apiKey, "/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (status === 201 || status === 204) {
    return { ok: true, id: (json.id as string | number | undefined) ?? undefined };
  }

  if (status === 400 && /already|duplicate|exist/i.test(text)) {
    const email = encodeURIComponent(args.email.trim().toLowerCase());
    const patchBody: Record<string, unknown> = {
      attributes: args.attributes,
    };
    if (args.listIds?.length) patchBody.listIds = args.listIds;
    if (args.unlinkListIds?.length) patchBody.unlinkListIds = args.unlinkListIds;

    const patched = await brevoFetch(args.cfg.apiKey, `/contacts/${email}`, {
      method: "PUT",
      body: JSON.stringify(patchBody),
    });
    if (patched.status >= 200 && patched.status < 300) {
      return { ok: true };
    }
    return {
      ok: false,
      error: String(patched.json.message ?? patched.text.slice(0, 300)),
    };
  }

  return {
    ok: false,
    error: String(json.message ?? (text.slice(0, 300) || `http_${status}`)),
  };
}

export async function sendBrevoEmail(args: {
  cfg: ResolvedWebinarMailConfig;
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  tags?: string[];
}): Promise<BrevoSendResult> {
  if (!args.cfg.apiKey) {
    if (args.cfg.smtpKey) {
      return {
        ok: false,
        error:
          "brevo_api_key_required — SMTP key alone cannot call Brevo REST. Create an API key in Brevo → Settings → API Keys and save it in CMS Settings.",
      };
    }
    return { ok: false, error: "brevo_not_configured" };
  }

  const { status, json, text } = await brevoFetch(args.cfg.apiKey, "/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: {
        name: args.cfg.fromName,
        email: extractEmailAddress(args.cfg.fromEmail),
      },
      to: [
        {
          email: args.toEmail.trim().toLowerCase(),
          name: args.toName || undefined,
        },
      ],
      subject: args.subject,
      htmlContent: args.htmlContent,
      textContent: args.textContent,
      tags: args.tags,
    }),
  });

  if (status >= 200 && status < 300) {
    return {
      ok: true,
      messageId: String(json.messageId ?? ""),
      via: "api",
    };
  }
  return {
    ok: false,
    error: String(json.message ?? (text.slice(0, 300) || `http_${status}`)),
  };
}

function extractEmailAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  if (m?.[1]) return m[1].trim();
  return from.trim();
}
