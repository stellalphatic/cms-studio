"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { readingMinutes, slugify } from "@/lib/utils";
import { withAction } from "@/lib/action-error";

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
  published_at: z.string().optional().nullable(),
  scheduled_for: z.string().optional().nullable(),
  author_name: z.string().max(120).optional().nullable(),
  author_avatar_url: z.string().max(500).optional().nullable(),
  seo_title: z.string().max(160).optional().nullable(),
  seo_description: z.string().max(320).optional().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Coerce a value from <input type="datetime-local"> (e.g. "2025-05-17T14:30")
 * into a Postgres-safe ISO string. Returns null for empty input. Passthrough
 * for already-ISO values.
 */
function toIsoOrNull(v?: string | null): string | null {
  if (!v) return null;
  // already ISO with timezone — keep as-is
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Find or create the per-site author by name. Cheap upsert because each site
 * has a unique (site_id, slug) constraint. Returns the author id, or null if
 * no name was provided. Avatar URL is updated when supplied so renaming an
 * existing author by the same name refreshes their picture.
 */
async function resolveAuthorId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  siteId: string,
  name?: string | null,
  avatarUrl?: string | null,
): Promise<string | null> {
  if (!name?.trim()) return null;
  const cleanName = name.trim().slice(0, 120);
  const slug = slugify(cleanName) || cleanName.toLowerCase().replace(/\s+/g, "-");

  const { data: existing } = await supabase
    .from("authors")
    .select("id, avatar_url")
    .eq("site_id", siteId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    if (avatarUrl && avatarUrl !== existing.avatar_url) {
      await supabase.from("authors").update({ avatar_url: avatarUrl }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("authors")
    .insert({
      site_id: siteId,
      name: cleanName,
      slug,
      avatar_url: avatarUrl || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

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
    published_at: toIsoOrNull(String(formData.get("published_at") ?? "")),
    scheduled_for: toIsoOrNull(String(formData.get("scheduled_for") ?? "")),
    author_name: String(formData.get("author_name") ?? "") || null,
    author_avatar_url: String(formData.get("author_avatar_url") ?? "") || null,
    seo_title: String(formData.get("seo_title") ?? "") || null,
    seo_description: String(formData.get("seo_description") ?? "") || null,
    custom_fields: custom,
  };
  return blogSchema.parse(data);
}

export async function createBlogPost(siteSlug: string, formData: FormData) {
  return withAction("createBlogPost", async () => {
    const { ctx, site } = await requireSiteAccess(siteSlug);
    const input = parseFormData(formData);
    const supabase = await createSupabaseServerClient();

    if (!input.slug) input.slug = slugify(input.title);
    if (!input.slug) throw new Error("Title or slug is required");
    if (input.status === "published" && !input.published_at) {
      input.published_at = new Date().toISOString();
    }

    const authorId = await resolveAuthorId(
      supabase,
      site.id,
      input.author_name,
      input.author_avatar_url,
    );

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
        author_id: authorId,
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
  });
}

export async function updateBlogPost(siteSlug: string, id: string, formData: FormData) {
  return withAction("updateBlogPost", async () => {
    const { ctx, site } = await requireSiteAccess(siteSlug);
    const input = parseFormData(formData);
    const supabase = await createSupabaseServerClient();

    if (input.status === "published" && !input.published_at) {
      input.published_at = new Date().toISOString();
    }

    const authorId = await resolveAuthorId(
      supabase,
      site.id,
      input.author_name,
      input.author_avatar_url,
    );

    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        body_html: input.body_html,
        cover_url: input.cover_url || null,
        cover_alt: input.cover_alt,
        author_id: authorId,
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
  });
}

export async function deleteBlogPost(siteSlug: string, id: string) {
  return withAction("deleteBlogPost", async () => {
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
  });
}
