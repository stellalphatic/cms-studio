import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Site } from "@/lib/supabase/types";
import { voidMetaCapiEvent } from "@/lib/meta-capi";
import { upsertUnpaidWebinarRegistration } from "@/lib/webinar-register";

/**
 * Public form-submission endpoint, on the CMS URL.
 *
 *   POST  https://<your-cms>/api/v1/sites/<siteSlug>/submit-form
 *   Body: { form_name?: string, payload: Record<string, unknown>,
 *           turnstileToken?: string }
 *
 * Why this exists when we also have a Supabase Edge Function:
 *   • Same-domain as the CMS — no Supabase URL leaks into client code.
 *   • White-labelable: `cms.acme.com/api/...` is the only surface a client
 *     site touches; we can swap backends without anyone noticing.
 *   • No Supabase gateway apikey gymnastics.
 *   • One CORS allow-list (site.allowed_origins) governs reads AND writes.
 *
 * The Edge Function is still shipped for power users / cron / internal jobs
 * but this route is what the SDK + docs recommend.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLATFORM_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

interface SubmitBody {
  form_name?: string;
  // Backwards-compat aliases — accept what people commonly send.
  form?: string;
  payload?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  turnstileToken?: string;
  "cf-turnstile-response"?: string;
  /** Browser Pixel cookies + shared event_id for CAPI↔Pixel dedup. */
  meta?: {
    fbp?: string;
    fbc?: string;
    event_id?: string;
  };
}

export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await ctx.params;
  const cors = await corsFor(req, siteSlug);
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await ctx.params;
  const sb = createSupabaseAdminClient();

  const { data: site } = await sb
    .from("sites")
    .select(
      "id, slug, resend_api_key, resend_from_email, notify_emails, allowed_origins, turnstile_site_key, turnstile_secret_key",
    )
    .eq("slug", siteSlug)
    .maybeSingle<
      Pick<
        Site,
        | "id"
        | "slug"
        | "resend_api_key"
        | "resend_from_email"
        | "notify_emails"
        | "allowed_origins"
        | "turnstile_site_key"
        | "turnstile_secret_key"
      >
    >();

  const cors = buildCors(req.headers.get("origin"), site?.allowed_origins ?? []);

  if (!site) {
    return json({ error: "unknown_site" }, 404, cors);
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }

  const formName = (body.form_name ?? body.form ?? "contact").toString().slice(0, 64);
  const payload = (body.payload ?? body.fields ?? {}) as Record<string, unknown>;
  const turnstileToken = (body.turnstileToken ?? body["cf-turnstile-response"] ?? "").toString();

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "missing_payload" }, 400, cors);
  }

  // Honeypot — silently accept and discard if filled.
  if (typeof (payload as { _hp?: unknown })._hp === "string" && (payload as { _hp: string })._hp.length) {
    return json({ ok: true }, 201, cors);
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null;
  const ua = req.headers.get("user-agent");

  // Captcha is opt-in PER SITE. A site only enforces Turnstile when it has
  // both a site_key (so the widget can render on the client) and a secret_key
  // (so we can verify the response). Sites that haven't configured both are
  // submitted straight through — this stops a platform-wide env var from
  // accidentally locking out every freshly onboarded site.
  const siteSecret = site.turnstile_secret_key?.trim();
  const siteKey = site.turnstile_site_key?.trim();
  if (siteSecret && siteKey) {
    if (!turnstileToken) {
      return json({ error: "captcha_required" }, 400, cors);
    }
    if (!(await verifyTurnstile(siteSecret, turnstileToken, ip))) {
      return json({ error: "captcha_failed" }, 400, cors);
    }
  }

  // Defensive: strip leading <script tags from any string value.
  const sanitised: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    sanitised[k] = typeof v === "string" ? v.replace(/<\s*script/gi, "&lt;script") : v;
  }

  const { data: row, error: insertErr } = await sb
    .from("form_submissions")
    .insert({
      site_id: site.id,
      form_name: formName,
      payload: sanitised,
      source_url: req.headers.get("referer") ?? null,
      ip_address: ip,
      user_agent: ua,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    return json({ error: insertErr?.message ?? "insert_failed" }, 500, cors);
  }

  // Kingsbridge webinar: also create an unpaid seat row and return the Stripe
  // Payment Link so the public site can redirect the registrant to pay $1.
  let webinarExtra: Record<string, unknown> | null = null;
  if (formName === "webinar_registration") {
    const webinar = await upsertUnpaidWebinarRegistration({
      sb,
      siteId: site.id,
      formSubmissionId: row.id,
      payload: sanitised,
      sourceUrl: req.headers.get("referer") ?? null,
      ip,
      userAgent: ua,
    });
    if (!webinar.ok) {
      // Roll back the inbox row so we don't leave unpaid form noise without a seat.
      await sb.from("form_submissions").delete().eq("id", row.id);
      return json({ error: webinar.error }, webinar.status, cors);
    }
    webinarExtra = {
      registration_id: webinar.registration_id,
      payment_status: webinar.payment_status,
      payment_url: webinar.payment_url,
    };
    sanitised.registration_id = webinar.registration_id;
    sanitised.payment_status = webinar.payment_status;
  }

  // Fire-and-forget email. Per-site Resend overrides platform default.
  const resendKey = site.resend_api_key ?? process.env.RESEND_API_KEY ?? "";
  const resendFrom = site.resend_from_email ?? process.env.RESEND_FROM_EMAIL ?? "";

  // Recipient resolution, in priority order:
  //   1. Explicit `notify_emails` list configured in Settings → Form
  //      notifications. Honoured even if it's an empty array — "I deliberately
  //      don't want emails" is a valid choice.
  //   2. Fallback: every site member whose role is owner or admin. This way
  //      a freshly onboarded site doesn't silently drop the first
  //      submission. Members below admin (editors/viewers) are NOT included —
  //      contact emails often contain phone numbers / personal info.
  let notifyList: string[] = (site.notify_emails ?? []).filter(Boolean);
  if (notifyList.length === 0) {
    notifyList = await fallbackRecipients(sb, site.id);
  }

  if (resendKey && resendFrom && notifyList.length) {
    void sendEmail({
      apiKey: resendKey,
      from: resendFrom,
      to: notifyList,
      subject:
        formName === "webinar_registration"
          ? `New webinar reservation (unpaid) · ${site.slug}`
          : `New ${formName} submission · ${site.slug}`,
      payload: sanitised,
      origin: req.headers.get("origin") ?? site.slug,
    });
  }

  // Kingsbridge: Meta CAPI Lead after the CMS row is committed (Pixel stays client-side).
  if (site.slug === "kingsbridge") {
    const leadEventId =
      (typeof body.meta?.event_id === "string" && body.meta.event_id.trim()) ||
      `lead_${row.id}`;
    const email = String(sanitised.email ?? "").trim() || null;
    const phone =
      String(sanitised.whatsapp ?? sanitised.phone ?? "").trim() || null;
    const name = String(sanitised.name ?? "").trim() || null;
    voidMetaCapiEvent({
      eventName: "Lead",
      eventId: leadEventId,
      eventSourceUrl: req.headers.get("referer") ?? req.headers.get("origin"),
      email,
      phone,
      name,
      ip,
      userAgent: ua,
      fbp: body.meta?.fbp ?? null,
      fbc: body.meta?.fbc ?? null,
      externalId: row.id,
      customData: {
        content_name: formName,
        content_category: formName === "webinar_registration" ? "webinar" : "lead",
        content_ids: [row.id],
      },
    });
  }

  return json(
    {
      ok: true,
      id: row.id,
      event_id:
        (typeof body.meta?.event_id === "string" && body.meta.event_id.trim()) ||
        `lead_${row.id}`,
      ...(webinarExtra ?? {}),
    },
    201,
    cors,
  );
}

/**
 * Returns the email addresses of every owner + admin on the given site.
 * Used when the workspace hasn't configured an explicit notify list yet.
 */
async function fallbackRecipients(
  sb: ReturnType<typeof createSupabaseAdminClient>,
  siteId: string,
): Promise<string[]> {
  const { data } = await sb
    .from("site_members")
    .select("role, profiles:profiles!inner(email)")
    .eq("site_id", siteId)
    .in("role", ["owner", "admin"]);
  type Row = { profiles: { email: string } | { email: string }[] | null };
  const rows = (data as Row[] | null) ?? [];
  const emails: string[] = [];
  for (const r of rows) {
    if (Array.isArray(r.profiles)) {
      for (const p of r.profiles) if (p?.email) emails.push(p.email);
    } else if (r.profiles?.email) {
      emails.push(r.profiles.email);
    }
  }
  return Array.from(new Set(emails));
}

// ─── helpers ─────────────────────────────────────────────────────────────

async function corsFor(req: NextRequest, siteSlug: string): Promise<HeadersInit> {
  const sb = createSupabaseAdminClient();
  const { data: site } = await sb
    .from("sites")
    .select("allowed_origins")
    .eq("slug", siteSlug)
    .maybeSingle<{ allowed_origins: string[] | null }>();
  return buildCors(req.headers.get("origin"), site?.allowed_origins ?? []);
}

function buildCors(origin: string | null, siteAllowed: string[]): HeadersInit {
  const all = [...siteAllowed, ...PLATFORM_ALLOWED_ORIGINS];
  const allow =
    !all.length ||
    (origin && all.some((p) => origin === p || origin.endsWith(p)))
      ? origin ?? "*"
      : all[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status: number, cors: HeadersInit) {
  const headers = new Headers(cors);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new NextResponse(JSON.stringify(data), { status, headers });
}

async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string | null,
): Promise<boolean> {
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const j = (await res.json()) as { success?: boolean };
    return Boolean(j.success);
  } catch {
    return false;
  }
}

async function sendEmail(args: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  payload: Record<string, unknown>;
  origin: string;
}) {
  const rows = Object.entries(args.payload)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#666;font-weight:600;vertical-align:top">${escapeHtml(
          k,
        )}</td><td style="padding:6px 12px">${escapeHtml(String(v ?? ""))}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:system-ui,Arial,sans-serif"><h2 style="margin:0 0 12px">${escapeHtml(
    args.subject,
  )}</h2><p style="color:#666;margin:0 0 16px">Received via ${escapeHtml(
    args.origin,
  )}</p><table style="border-collapse:collapse;font-size:14px">${rows}</table></div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: args.to,
        subject: args.subject,
        html,
      }),
    });
  } catch {
    // best-effort
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
