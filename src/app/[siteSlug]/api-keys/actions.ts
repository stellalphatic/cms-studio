"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  expires_in_days: z.coerce.number().int().min(0).max(3650).default(0),
});

export async function createApiKey(siteSlug: string, formData: FormData) {
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  if (!hasRole(role, "admin")) throw new Error("Only admins can create API keys");

  const input = createSchema.parse({
    name: String(formData.get("name") ?? "").trim(),
    expires_in_days: formData.get("expires_in_days") ?? 0,
  });

  const env = (process.env.NODE_ENV === "production" ? "live" : "test") as "live" | "test";
  const { plaintext, token_hash, prefix } = generateApiKey(env);

  const expires_at =
    input.expires_in_days > 0
      ? new Date(Date.now() + input.expires_in_days * 86400 * 1000).toISOString()
      : null;

  const sb = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("api_keys")
    .insert({
      site_id: site.id,
      name: input.name,
      prefix,
      token_hash,
      created_by: ctx.user.id,
      expires_at,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "create",
    entity: "api_key",
    entity_id: data.id,
    diff: { name: input.name, prefix },
  });

  revalidatePath(`/${siteSlug}/api-keys`);
  // Return the plaintext ONCE — UI must render it and warn the user.
  return { plaintext };
}

export async function revokeApiKey(siteSlug: string, keyId: string) {
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  if (!hasRole(role, "admin")) throw new Error("Only admins can revoke API keys");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "revoke",
    entity: "api_key",
    entity_id: keyId,
  });

  revalidatePath(`/${siteSlug}/api-keys`);
}
