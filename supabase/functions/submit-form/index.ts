// Supabase Edge Function: submit-form
//
// Public endpoint that any front-end form can POST to. Verifies a
// Cloudflare Turnstile token, looks up the site by `site` body param or
// Origin header, and inserts a row into form_submissions.
//
//   POST /functions/v1/submit-form
//   Body: { site: 'searchhub' | 'kingsbridge' | 'vantage',
//           form_name: 'contact' | 'audit' | 'consultation',
//           payload: { name, email, message, ...anything },
//           turnstileToken: string }

// deno-lint-ignore-file
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

const PLATFORM_ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null, siteOrigins: string[] = []) {
  const all = [...siteOrigins, ...PLATFORM_ALLOWED_ORIGINS];
  const allow =
    !all.length ||
    (origin && all.some((p) => origin === p || origin.endsWith(p)))
      ? origin ?? "*"
      : all[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
  };
}

async function verifyTurnstile(token: string, ip: string | null) {
  if (!TURNSTILE_SECRET) return true; // skipped in dev when secret unset
  const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const json = (await res.json()) as { success: boolean };
  return Boolean(json.success);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  // Initial CORS without site context — overwritten after we resolve the site.
  let cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  let body: {
    site?: string;
    form_name?: string;
    payload?: Record<string, unknown>;
    turnstileToken?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: cors });
  }

  const siteSlug = body.site;
  const formName = body.form_name ?? "contact";
  const payload = body.payload ?? {};
  if (!siteSlug || typeof siteSlug !== "string") {
    return new Response("Missing 'site'", { status: 400, headers: cors });
  }

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for");
  const ua = req.headers.get("user-agent");

  const ok = await verifyTurnstile(body.turnstileToken ?? "", ip);
  if (!ok) {
    return new Response(JSON.stringify({ error: "captcha_failed" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id, resend_api_key, resend_from_email, notify_emails, allowed_origins")
    .eq("slug", siteSlug)
    .maybeSingle();
  if (siteErr || !site) {
    return new Response(JSON.stringify({ error: "unknown_site" }), {
      status: 404,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Re-compute CORS with the site's own allowed origins now that we know them.
  cors = corsHeaders(origin, site.allowed_origins ?? []);

  // Defensive sanitisation: strip obvious script tags from string fields.
  const sanitised: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    sanitised[k] = typeof v === "string" ? v.replace(/<\s*script/gi, "&lt;script") : v;
  }

  const { error: insertErr, data: row } = await supabase
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

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Email notification — prefer per-site config, fall back to platform env.
  const resendKey =
    (site.resend_api_key as string | null) ?? Deno.env.get("RESEND_API_KEY") ?? "";
  const resendFrom =
    (site.resend_from_email as string | null) ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "";
  const notifyList: string[] =
    (site.notify_emails as string[] | null) ??
    (Deno.env.get(`NOTIFY_${siteSlug.toUpperCase()}`) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  if (resendKey && resendFrom && notifyList.length) {
    const rows = Object.entries(sanitised)
      .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#666;font-weight:600">${k}</td><td style="padding:6px 12px">${String(v ?? "")}</td></tr>`)
      .join("");
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: notifyList,
        subject: `New ${formName} submission · ${siteSlug}`,
        html: `<div style="font-family:system-ui,Arial,sans-serif"><h2 style="margin:0 0 12px">New ${formName} submission</h2><p style="color:#666;margin:0 0 16px">Received via ${origin ?? siteSlug}</p><table style="border-collapse:collapse;font-size:14px">${rows}</table></div>`,
      }),
    }).catch(() => {/* best-effort */});
  }

  return new Response(JSON.stringify({ ok: true, id: row.id }), {
    status: 201,
    headers: { ...cors, "content-type": "application/json" },
  });
});
