import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Site } from "@/lib/supabase/types";

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

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY ?? "";
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
    .select("id, slug, resend_api_key, resend_from_email, notify_emails, allowed_origins")
    .eq("slug", siteSlug)
    .maybeSingle<
      Pick<
        Site,
        "id" | "slug" | "resend_api_key" | "resend_from_email" | "notify_emails" | "allowed_origins"
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

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return json({ error: "captcha_failed" }, 400, cors);
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

  // Fire-and-forget email. Per-site Resend overrides platform default.
  const resendKey = site.resend_api_key ?? process.env.RESEND_API_KEY ?? "";
  const resendFrom = site.resend_from_email ?? process.env.RESEND_FROM_EMAIL ?? "";
  const notifyList =
    site.notify_emails ??
    (process.env[`NOTIFY_${site.slug.toUpperCase()}`] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  if (resendKey && resendFrom && notifyList.length) {
    void sendEmail({
      apiKey: resendKey,
      from: resendFrom,
      to: notifyList,
      subject: `New ${formName} submission · ${site.slug}`,
      payload: sanitised,
      origin: req.headers.get("origin") ?? site.slug,
    });
  }

  return json({ ok: true, id: row.id }, 201, cors);
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

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // skipped in dev / when not configured
  if (!token) return false;
  const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
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
