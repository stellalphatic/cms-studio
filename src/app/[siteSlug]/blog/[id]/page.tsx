import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { getSiteSchema } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BlogForm } from "../blog-form";
import { deleteBlogPost, updateBlogPost } from "../actions";
import type { BlogPost } from "@/lib/supabase/types";

export const metadata = { title: "Edit post" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .eq("site_id", site.id)
    .maybeSingle<BlogPost>();

  if (!post) notFound();

  const schema = getSiteSchema(siteSlug);
  const blogConfig = schema?.contentTypes.find((c) => c.key === "blog_posts");

  const previewUrl = site.primary_domain
    ? `https://${site.primary_domain}/preview/blog/${post.slug}`
    : null;

  return (
    <div>
      {/* Minimal breadcrumb — the editor itself owns the page hierarchy.
          No big PageHeader here, the editor's title input IS the headline. */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href={`/${site.slug}/blog`}
          className="inline-flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] transition hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Blog
        </Link>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Preview <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <BlogForm
        siteSlug={siteSlug}
        siteId={site.id}
        initial={post}
        customFields={blogConfig?.customFields}
        onSubmit={async (fd) => {
          "use server";
          await updateBlogPost(siteSlug, id, fd);
        }}
        onDelete={async () => {
          "use server";
          await deleteBlogPost(siteSlug, id);
        }}
      />
    </div>
  );
}
