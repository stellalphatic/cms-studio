import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Hashes an API key plaintext to its stored form.
 */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/**
 * Generates a fresh API key. Returns the plaintext (to show ONCE in the UI)
 * plus its hash and prefix.
 *
 * Format: sk_<env>_<32 base32 chars>
 *   sk_live_ABCDEFGH...    production
 *   sk_test_ABCDEFGH...    anything else
 */
export function generateApiKey(env: "live" | "test" = "live") {
  const random = randomBytes(20).toString("base64url"); // 27 chars URL-safe
  const plaintext = `sk_${env}_${random}`;
  return {
    plaintext,
    token_hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, 12),
  };
}

/**
 * Verifies an Authorization header against the api_keys table for a given
 * site. Returns the key record (without secret) when valid, null otherwise.
 *
 * Updates `last_used_at` (best-effort, fire-and-forget).
 */
export async function verifyApiKey(opts: {
  siteId: string;
  authHeader: string | null;
}): Promise<{ id: string; scopes: string[] } | null> {
  if (!opts.authHeader) return null;
  const m = opts.authHeader.match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  const hash = hashApiKey(m[1]);

  const sb = createSupabaseAdminClient();
  const { data: row } = await sb
    .from("api_keys")
    .select("id, site_id, scopes, revoked_at, expires_at")
    .eq("token_hash", hash)
    .eq("site_id", opts.siteId)
    .maybeSingle();
  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

  // Fire-and-forget timestamp update
  sb.from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return { id: row.id, scopes: row.scopes ?? ["read"] };
}
