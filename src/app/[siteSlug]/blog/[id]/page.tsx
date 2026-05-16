import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { getSiteSchema } from "@/lib/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={post.title || "(untitled)"}
        description={`/${post.slug}`}
        action={
          previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium shadow-xs transition hover:bg-[var(--color-surface-2)]"
            >
              Preview <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      />
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
