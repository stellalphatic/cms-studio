"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { withAction } from "@/lib/action-error";
import { slugify } from "@/lib/utils";

const pageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  body_html: z.string().default(""),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  seo_title: z.string().max(200).optional().nullable(),
  seo_description: z.string().max(400).optional().nullable(),
});

function ensureEditor(role: string) {
  if (!hasRole(role as "owner" | "admin" | "editor" | "viewer", "editor")) {
    throw new Error("Only editors can change pages");
  }
}

function parse(formData: FormData) {
  return pageSchema.parse({
    title: String(formData.get("title") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "")),
    body_html: String(formData.get("body_html") ?? ""),
    status: (String(formData.get("status") ?? "draft") || "draft") as "draft",
    seo_title: String(formData.get("seo_title") ?? "") || null,
    seo_description: String(formData.get("seo_description") ?? "") || null,
  });
}

export async function createPage(siteSlug: string, formData: FormData) {
  return withAction("createPage", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);
    if (!input.slug) input.slug = slugify(input.title);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("pages")
      .insert({
        site_id: site.id,
        title: input.title,
        slug: input.slug,
        body_html: input.body_html,
        status: input.status,
        seo: {
          title: input.seo_title ?? undefined,
          description: input.seo_description ?? undefined,
        },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "create",
      entity: "pages",
      entity_id: data.id,
      diff: { title: input.title, slug: input.slug },
    });
    revalidatePath(`/${siteSlug}/pages`);
    redirect(`/${siteSlug}/pages/${data.id}?created=1`);
  });
}

export async function updatePage(siteSlug: string, id: string, formData: FormData) {
  return withAction("updatePage", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("pages")
      .update({
        title: input.title,
        slug: input.slug,
        body_html: input.body_html,
        status: input.status,
        seo: {
          title: input.seo_title ?? undefined,
          description: input.seo_description ?? undefined,
        },
      })
      .eq("id", id)
      .eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "update",
      entity: "pages",
      entity_id: id,
      diff: { title: input.title, slug: input.slug },
    });
    revalidatePath(`/${siteSlug}/pages`);
    revalidatePath(`/${siteSlug}/pages/${id}`);
  });
}

export async function deletePage(siteSlug: string, id: string) {
  return withAction("deletePage", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("pages").delete().eq("id", id).eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "delete",
      entity: "pages",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/pages`);
    redirect(`/${siteSlug}/pages`);
  });
}
