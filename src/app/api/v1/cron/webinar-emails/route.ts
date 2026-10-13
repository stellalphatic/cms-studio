import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { processDueUnpaidReminders } from "@/lib/webinar-emails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron: send unpaid $1 payment reminders that are due.
 * Protect with CRON_SECRET (Authorization: Bearer <secret>).
 */
export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "cron_secret_required" }, { status: 503 });
  }

  const sb = createSupabaseAdminClient();
  const result = await processDueUnpaidReminders(sb);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
