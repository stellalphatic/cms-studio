"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens"),
  name: z.string().min(2).max(100),
  primary_domain: z.string().max(200).optional().nullable(),
  brand_primary: z.string().max(20).default("#4f46e5"),
  brand_tagline: z.string().max(200).optional().nullable(),
  enabled_content_types: z.string(),
});

const DEFAULT_TYPES = ["blog_posts", "case_studies", "testimonials", "faqs", "pages"];

export async function createSite(formData: FormData) {
  const ctx = await requireUser();
  if (!ctx.profile.is_platform_admin) throw new Error("Only platform admins can create sites");

  const input = createSchema.parse({
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    primary_domain: String(formData.get("primary_domain") ?? "") || null,
    brand_primary: String(formData.get("brand_primary") ?? "#4f46e5"),
    brand_tagline: String(formData.get("brand_tagline") ?? "") || null,
    enabled_content_types: String(formData.get("enabled_content_types") ?? DEFAULT_TYPES.join(",")),
  });

  const types = input.enabled_content_types
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sb = createSupabaseAdminClient();
  const { data, error } = await sb
    .from("sites")
    .insert({
      slug: input.slug,
      name: input.name,
      primary_domain: input.primary_domain,
      brand: { primary: input.brand_primary, tagline: input.brand_tagline },
      enabled_content_types: types.length ? types : DEFAULT_TYPES,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Trigger 0003 grants the platform admin owner on new sites automatically.
  await logAudit({
    site_id: data.id,
    actor_id: ctx.user.id,
    action: "create",
    entity: "site",
    entity_id: data.id,
    diff: { slug: input.slug, name: input.name },
  });

  revalidatePath("/admin/sites");
  revalidatePath("/workspaces");
}

export async function deleteSite(siteId: string) {
  const ctx = await requireUser();
  if (!ctx.profile.is_platform_admin) throw new Error("Only platform admins can delete sites");

  const sb = createSupabaseAdminClient();
  const { error } = await sb.from("sites").delete().eq("id", siteId);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: null,
    actor_id: ctx.user.id,
    action: "delete",
    entity: "site",
    entity_id: siteId,
  });

  revalidatePath("/admin/sites");
}
