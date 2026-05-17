"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { withAction } from "@/lib/action-error";

const schema = z.object({
  author_name: z.string().min(1, "Author is required").max(120),
  author_role: z.string().max(160).optional().nullable(),
  quote: z.string().min(1, "Quote is required").max(2000),
  avatar_url: z.string().url().or(z.literal("")).optional().nullable(),
  weight: z.coerce.number().int().default(0),
  is_published: z.boolean().default(true),
});

function ensureEditor(role: string) {
  if (!hasRole(role as "owner" | "admin" | "editor" | "viewer", "editor")) {
    throw new Error("Only editors can change testimonials");
  }
}

function parse(formData: FormData) {
  return schema.parse({
    author_name: String(formData.get("author_name") ?? "").trim(),
    author_role: String(formData.get("author_role") ?? "") || null,
    quote: String(formData.get("quote") ?? "").trim(),
    avatar_url: String(formData.get("avatar_url") ?? "") || null,
    weight: String(formData.get("weight") ?? "0"),
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
  });
}

export async function createTestimonial(siteSlug: string, formData: FormData) {
  return withAction("createTestimonial", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("testimonials")
      .insert({ site_id: site.id, ...input })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "create",
      entity: "testimonials",
      entity_id: data.id,
    });
    revalidatePath(`/${siteSlug}/testimonials`);
  });
}

export async function updateTestimonial(siteSlug: string, id: string, formData: FormData) {
  return withAction("updateTestimonial", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("testimonials")
      .update(input)
      .eq("id", id)
      .eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "update",
      entity: "testimonials",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/testimonials`);
  });
}

export async function deleteTestimonial(siteSlug: string, id: string) {
  return withAction("deleteTestimonial", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("testimonials").delete().eq("id", id).eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "delete",
      entity: "testimonials",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/testimonials`);
  });
}
