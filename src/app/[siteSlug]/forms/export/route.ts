import { type NextRequest } from "next/server";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const form = url.searchParams.get("form");

  let q = supabase
    .from("form_submissions")
    .select("created_at, form_name, status, payload, source_url")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  if (form) q = q.eq("form_name", form);

  const { data, error } = await q;
  if (error) return new Response(error.message, { status: 500 });

  // Discover all payload keys in result set
  const payloadKeys = new Set<string>();
  for (const r of data ?? []) {
    for (const k of Object.keys((r.payload ?? {}) as object)) payloadKeys.add(k);
  }
  const cols = ["created_at", "form_name", "status", "source_url", ...payloadKeys];
  const rows = [cols.join(",")];
  for (const r of data ?? []) {
    const payload = (r.payload ?? {}) as Record<string, unknown>;
    rows.push(
      cols
        .map((c) => {
          if (c === "created_at") return csvEscape(r.created_at);
          if (c === "form_name") return csvEscape(r.form_name);
          if (c === "status") return csvEscape(r.status);
          if (c === "source_url") return csvEscape(r.source_url);
          return csvEscape(payload[c]);
        })
        .join(","),
    );
  }

  return new Response(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${siteSlug}-submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
