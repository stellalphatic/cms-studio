import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { processDueUnpaidReminders } from "@/lib/webinar-emails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const auth = req.headers.get("authorization") ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  // Vercel injects Authorization: Bearer <CRON_SECRET> when the env is set.
  if (secret && auth === `Bearer ${secret}`) return true;

  // Some deployments omit the header; Vercel cron UA is still present.
  if (ua.startsWith("vercel-cron/")) return true;

  // Local / manual: allow when secret matches query ?secret=
  if (secret) {
    const q = req.nextUrl.searchParams.get("secret") ?? "";
    if (q && q === secret) return true;
  }

  // Dev without secret
  if (!secret && process.env.NODE_ENV !== "production") return true;

  return false;
}

/**
 * Vercel Cron: send unpaid $1 payment reminders that are due.
 * Protect with CRON_SECRET (Authorization: Bearer <secret>).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sb = createSupabaseAdminClient();
    const result = await processDueUnpaidReminders(sb);
    console.info("[cron/webinar-emails]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cron_failed";
    console.error("[cron/webinar-emails]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
