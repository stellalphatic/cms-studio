"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { withAction } from "@/lib/action-error";

const schema = z.object({
  tier_name: z.string().min(1, "Tier name is required").max(120),
  link_count: z
    .union([z.coerce.number().int().nonnegative(), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  price_per_link: z.string().max(60).optional().nullable(),
  total_price: z.string().max(60).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  features: z.array(z.string()).default([]),
  highlight: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  is_published: z.boolean().default(true),
});

function ensureEditor(role: string) {
  if (!hasRole(role as "owner" | "admin" | "editor" | "viewer", "editor")) {
    throw new Error("Only editors can change pricing");
  }
}

function parse(formData: FormData) {
  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return schema.parse({
    tier_name: String(formData.get("tier_name") ?? "").trim(),
    link_count: String(formData.get("link_count") ?? ""),
    price_per_link: String(formData.get("price_per_link") ?? "") || null,
    total_price: String(formData.get("total_price") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    features,
    highlight: formData.get("highlight") === "on",
    sort_order: String(formData.get("sort_order") ?? "0"),
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
  });
}

export async function createBulkTier(siteSlug: string, formData: FormData) {
  return withAction("createBulkTier", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("bulk_tiers")
      .insert({ site_id: site.id, ...input })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "create",
      entity: "bulk_tiers",
      entity_id: data.id,
    });
    revalidatePath(`/${siteSlug}/bulk-tiers`);
  });
}

export async function updateBulkTier(siteSlug: string, id: string, formData: FormData) {
  return withAction("updateBulkTier", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("bulk_tiers")
      .update(input)
      .eq("id", id)
      .eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "update",
      entity: "bulk_tiers",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/bulk-tiers`);
  });
}

export async function deleteBulkTier(siteSlug: string, id: string) {
  return withAction("deleteBulkTier", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("bulk_tiers").delete().eq("id", id).eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "delete",
      entity: "bulk_tiers",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/bulk-tiers`);
  });
}
