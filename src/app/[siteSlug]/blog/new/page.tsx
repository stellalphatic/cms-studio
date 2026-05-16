import { requireSiteAccess } from "@/lib/auth";
import { getSiteSchema } from "@/lib/schemas";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader title="New post" description="Draft something exceptional." />
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
