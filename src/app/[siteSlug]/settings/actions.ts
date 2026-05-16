"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const settingsSchema = z.object({
  name: z.string().min(1).max(120),
  primary_domain: z.string().max(200).optional().nullable(),
  cms_domain: z.string().max(200).optional().nullable(),
  brand_primary: z.string().max(20).optional().nullable(),
  brand_accent: z.string().max(20).optional().nullable(),
  brand_tagline: z.string().max(200).optional().nullable(),
  amplify_webhook_url: z.string().url().or(z.literal("")).optional().nullable(),
  resend_api_key: z.string().optional().nullable(),
  resend_from_email: z.string().optional().nullable(),
  notify_emails: z.string().optional().default(""),
  allowed_origins: z.string().optional().default(""),
});

export async function updateSiteSettings(siteSlug: string, formData: FormData) {
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  if (!hasRole(role, "admin")) throw new Error("Only admins can edit settings");

  const input = settingsSchema.parse({
    name: String(formData.get("name") ?? ""),
    primary_domain: String(formData.get("primary_domain") ?? "") || null,
    cms_domain: String(formData.get("cms_domain") ?? "") || null,
    brand_primary: String(formData.get("brand_primary") ?? "") || null,
    brand_accent: String(formData.get("brand_accent") ?? "") || null,
    brand_tagline: String(formData.get("brand_tagline") ?? "") || null,
    amplify_webhook_url: String(formData.get("amplify_webhook_url") ?? "") || null,
    resend_api_key: String(formData.get("resend_api_key") ?? "") || null,
    resend_from_email: String(formData.get("resend_from_email") ?? "") || null,
    notify_emails: String(formData.get("notify_emails") ?? ""),
    allowed_origins: String(formData.get("allowed_origins") ?? ""),
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("sites")
    .update({
      name: input.name,
      primary_domain: input.primary_domain,
      cms_domain: input.cms_domain?.toLowerCase() || null,
      brand: {
        ...site.brand,
        primary: input.brand_primary ?? site.brand?.primary,
        accent: input.brand_accent ?? site.brand?.accent,
        tagline: input.brand_tagline ?? site.brand?.tagline,
      },
      amplify_webhook_url: input.amplify_webhook_url || null,
      resend_api_key: input.resend_api_key,
      resend_from_email: input.resend_from_email,
      notify_emails: input.notify_emails
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allowed_origins: input.allowed_origins
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })
    .eq("id", site.id);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "site_settings",
    entity_id: site.id,
  });

  revalidatePath(`/${siteSlug}/settings`);
}
