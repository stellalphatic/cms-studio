import { createSupabaseAdminClient } from "./supabase/server";

export interface AuditEntry {
  site_id: string | null;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  diff?: Record<string, unknown>;
}

/**
 * Best-effort audit log write. Uses the service role to ensure inserts
 * succeed regardless of RLS, but logs failures silently — auditing should
 * never block the user-facing action.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const sb = createSupabaseAdminClient();
    await sb.from("audit_log").insert({
      site_id: entry.site_id,
      actor_id: entry.actor_id,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      diff: entry.diff ?? null,
    });
  } catch (e) {
    console.warn("[audit] write failed:", (e as Error).message);
  }
}
