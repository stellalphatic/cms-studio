import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { getSiteSchema } from "@/lib/schemas";
import { BlogForm } from "../blog-form";
import { createBlogPost } from "../actions";

export const metadata = { title: "New blog post" };

export default async function NewBlogPostPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const schema = getSiteSchema(siteSlug);
  const blogConfig = schema?.contentTypes.find((c) => c.key === "blog_posts");

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/${site.slug}/blog`}
          className="inline-flex items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] transition hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Blog
        </Link>
      </div>

      <BlogForm
        siteSlug={siteSlug}
        siteId={site.id}
        customFields={blogConfig?.customFields}
        onSubmit={async (fd) => {
          "use server";
          await createBlogPost(siteSlug, fd);
        }}
      />
    </div>
  );
}
