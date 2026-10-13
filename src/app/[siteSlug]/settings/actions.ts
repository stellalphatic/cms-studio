"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invalidateWhitelabelCache } from "@/lib/host";
import { logAudit } from "@/lib/audit";

const settingsSchema = z.object({
  name: z.string().min(1).max(120),
  primary_domain: z.string().max(200).optional().nullable(),
  cms_domain: z.string().max(200).optional().nullable(),
  brand_logo: z.string().max(500).optional().nullable(),
  brand_primary: z.string().max(20).optional().nullable(),
  brand_accent: z.string().max(20).optional().nullable(),
  brand_tagline: z.string().max(200).optional().nullable(),
  amplify_webhook_url: z.string().url().or(z.literal("")).optional().nullable(),
  resend_api_key: z.string().optional().nullable(),
  resend_from_email: z.string().optional().nullable(),
  notify_emails: z.string().optional().default(""),
  allowed_origins: z.string().optional().default(""),
  turnstile_site_key: z.string().max(200).optional().nullable(),
  turnstile_secret_key: z.string().max(200).optional().nullable(),
  brevo_api_key: z.string().optional().nullable(),
  brevo_smtp_login: z.string().optional().nullable(),
  brevo_smtp_key: z.string().optional().nullable(),
  brevo_from_email: z.string().optional().nullable(),
  brevo_from_name: z.string().optional().nullable(),
  brevo_leads_list_id: z.string().optional().nullable(),
  brevo_registered_list_id: z.string().optional().nullable(),
  webinar_date_label: z.string().optional().nullable(),
  webinar_local_time_label: z.string().optional().nullable(),
  webinar_timezone: z.string().optional().nullable(),
  webinar_zoom_url: z.string().optional().nullable(),
  webinar_zoom_meeting_id: z.string().optional().nullable(),
  webinar_zoom_passcode: z.string().optional().nullable(),
  webinar_unpaid_reminder_minutes: z.coerce.number().int().min(1).max(10080).optional(),
});

export async function updateSiteSettings(siteSlug: string, formData: FormData) {
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  if (!hasRole(role, "admin")) throw new Error("Only admins can edit settings");

  const input = settingsSchema.parse({
    name: String(formData.get("name") ?? ""),
    primary_domain: String(formData.get("primary_domain") ?? "") || null,
    cms_domain: String(formData.get("cms_domain") ?? "") || null,
    brand_logo: String(formData.get("brand_logo") ?? "") || null,
    brand_primary: String(formData.get("brand_primary") ?? "") || null,
    brand_accent: String(formData.get("brand_accent") ?? "") || null,
    brand_tagline: String(formData.get("brand_tagline") ?? "") || null,
    amplify_webhook_url: String(formData.get("amplify_webhook_url") ?? "") || null,
    resend_api_key: String(formData.get("resend_api_key") ?? "") || null,
    resend_from_email: String(formData.get("resend_from_email") ?? "") || null,
    notify_emails: String(formData.get("notify_emails") ?? ""),
    allowed_origins: String(formData.get("allowed_origins") ?? ""),
    turnstile_site_key: String(formData.get("turnstile_site_key") ?? "") || null,
    turnstile_secret_key: String(formData.get("turnstile_secret_key") ?? "") || null,
    brevo_api_key: String(formData.get("brevo_api_key") ?? "") || null,
    brevo_smtp_login: String(formData.get("brevo_smtp_login") ?? "") || null,
    brevo_smtp_key: String(formData.get("brevo_smtp_key") ?? "") || null,
    brevo_from_email: String(formData.get("brevo_from_email") ?? "") || null,
    brevo_from_name: String(formData.get("brevo_from_name") ?? "") || null,
    brevo_leads_list_id: String(formData.get("brevo_leads_list_id") ?? "") || null,
    brevo_registered_list_id:
      String(formData.get("brevo_registered_list_id") ?? "") || null,
    webinar_date_label: String(formData.get("webinar_date_label") ?? "") || null,
    webinar_local_time_label:
      String(formData.get("webinar_local_time_label") ?? "") || null,
    webinar_timezone: String(formData.get("webinar_timezone") ?? "") || null,
    webinar_zoom_url: String(formData.get("webinar_zoom_url") ?? "") || null,
    webinar_zoom_meeting_id:
      String(formData.get("webinar_zoom_meeting_id") ?? "") || null,
    webinar_zoom_passcode:
      String(formData.get("webinar_zoom_passcode") ?? "") || null,
    webinar_unpaid_reminder_minutes: Number(
      formData.get("webinar_unpaid_reminder_minutes") ?? 15,
    ),
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
        logo: input.brand_logo ?? site.brand?.logo,
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
      turnstile_site_key: input.turnstile_site_key,
      turnstile_secret_key: input.turnstile_secret_key,
      brevo_api_key: input.brevo_api_key,
      brevo_smtp_login: input.brevo_smtp_login,
      brevo_smtp_key: input.brevo_smtp_key,
      brevo_from_email: input.brevo_from_email,
      brevo_from_name: input.brevo_from_name,
      brevo_leads_list_id: input.brevo_leads_list_id,
      brevo_registered_list_id: input.brevo_registered_list_id,
      webinar_date_label: input.webinar_date_label,
      webinar_local_time_label: input.webinar_local_time_label,
      webinar_timezone: input.webinar_timezone,
      webinar_zoom_url: input.webinar_zoom_url,
      webinar_zoom_meeting_id: input.webinar_zoom_meeting_id,
      webinar_zoom_passcode: input.webinar_zoom_passcode,
      webinar_unpaid_reminder_minutes:
        input.webinar_unpaid_reminder_minutes ?? 15,
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

  // The middleware + workspace layout cache host→site mappings for 60s.
  // Invalidate so a freshly-saved CMS subdomain takes effect immediately.
  invalidateWhitelabelCache();
  revalidatePath(`/${siteSlug}/settings`);
}
