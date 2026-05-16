"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { readingMinutes, slugify } from "@/lib/utils";

const blogSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1).max(200),
  excerpt: z.string().max(400).optional().nullable(),
  body_html: z.string().default(""),
  cover_url: z.string().url().or(z.literal("")).optional().nullable(),
  cover_alt: z.string().max(200).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  published_at: z.string().datetime().optional().nullable(),
  scheduled_for: z.string().datetime().optional().nullable(),
  seo_title: z.string().max(160).optional().nullable(),
  seo_description: z.string().max(320).optional().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
});

type BlogInput = z.infer<typeof blogSchema>;

function parseFormData(formData: FormData): BlogInput {
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const customRaw = String(formData.get("custom_fields") ?? "{}");
  let custom: Record<string, unknown> = {};
  try {
    custom = JSON.parse(customRaw);
  } catch {
    custom = {};
  }
  const data = {
    title: String(formData.get("title") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "")),
    excerpt: String(formData.get("excerpt") ?? "") || null,
    body_html: String(formData.get("body_html") ?? ""),
    cover_url: String(formData.get("cover_url") ?? "") || null,
    cover_alt: String(formData.get("cover_alt") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags,
    status: (String(formData.get("status") ?? "draft") as BlogInput["status"]) || "draft",
    published_at: String(formData.get("published_at") ?? "") || null,
    scheduled_for: String(formData.get("scheduled_for") ?? "") || null,
    seo_title: String(formData.get("seo_title") ?? "") || null,
    seo_description: String(formData.get("seo_description") ?? "") || null,
    custom_fields: custom,
  };
  return blogSchema.parse(data);
}

export async function createBlogPost(siteSlug: string, formData: FormData) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const input = parseFormData(formData);
  const supabase = await createSupabaseServerClient();

  if (!input.slug) input.slug = slugify(input.title);
  if (input.status === "published" && !input.published_at) {
    input.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      site_id: site.id,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body_html: input.body_html,
      cover_url: input.cover_url || null,
      cover_alt: input.cover_alt,
      category: input.category,
      tags: input.tags,
      status: input.status,
      published_at: input.published_at,
      scheduled_for: input.scheduled_for,
      read_minutes: readingMinutes(input.body_html),
      seo: {
        title: input.seo_title ?? undefined,
        description: input.seo_description ?? undefined,
      },
      custom_fields: input.custom_fields,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "create",
    entity: "blog_posts",
    entity_id: data.id,
    diff: { title: input.title, status: input.status },
  });

  revalidatePath(`/${siteSlug}/blog`);
  redirect(`/${siteSlug}/blog/${data.id}?created=1`);
}

export async function updateBlogPost(siteSlug: string, id: string, formData: FormData) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const input = parseFormData(formData);
  const supabase = await createSupabaseServerClient();

  if (input.status === "published" && !input.published_at) {
    input.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body_html: input.body_html,
      cover_url: input.cover_url || null,
      cover_alt: input.cover_alt,
      category: input.category,
      tags: input.tags,
      status: input.status,
      published_at: input.published_at,
      scheduled_for: input.scheduled_for,
      read_minutes: readingMinutes(input.body_html),
      seo: {
        title: input.seo_title ?? undefined,
        description: input.seo_description ?? undefined,
      },
      custom_fields: input.custom_fields,
      updated_by: ctx.user.id,
    })
    .eq("id", id)
    .eq("site_id", site.id);

  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "blog_posts",
    entity_id: id,
    diff: { title: input.title, status: input.status },
  });

  revalidatePath(`/${siteSlug}/blog`);
  revalidatePath(`/${siteSlug}/blog/${id}`);
}

export async function deleteBlogPost(siteSlug: string, id: string) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id).eq("site_id", site.id);
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "delete",
    entity: "blog_posts",
    entity_id: id,
  });
  revalidatePath(`/${siteSlug}/blog`);
  redirect(`/${siteSlug}/blog`);
}
