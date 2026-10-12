import { type NextRequest } from "next/server";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS = [
  "created_at",
  "paid_at",
  "payment_status",
  "name",
  "email",
  "whatsapp",
  "landing_variant",
  "source",
  "amount_cents",
  "currency",
  "stripe_checkout_session_id",
  "stripe_payment_intent_id",
  "stripe_customer_email",
  "source_url",
  "id",
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const variant = url.searchParams.get("variant");
  const q = (url.searchParams.get("q") ?? "").toLowerCase();

  let query = supabase
    .from("webinar_registrations")
    .select("*")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("payment_status", status);
  if (variant) query = query.eq("landing_variant", variant);

  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  let rows = (data ?? []) as Array<Record<string, unknown>>;
  if (q) {
    rows = rows.filter((r) => {
      const blob = `${r.name ?? ""} ${r.email ?? ""} ${r.whatsapp ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }

  const out = [COLUMNS.join(",")];
  for (const r of rows) {
    out.push(COLUMNS.map((c) => csvEscape(r[c])).join(","));
  }

  return new Response(out.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${siteSlug}-webinar-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
