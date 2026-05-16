import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ContentStatusPill } from "@/components/ui/status-pill";
import { formatDate, formatRelative } from "@/lib/utils";
import type { BlogPost } from "@/lib/supabase/types";

export const metadata = { title: "Blog" };

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, status, published_at, updated_at, category")
    .eq("site_id", site.id)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Articles, insights, and announcements that publish to the site."
        action={
          <Link href={`/${site.slug}/blog/new`}>
            <Button>
              <Plus className="h-4 w-4" /> New post
            </Button>
          </Link>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {posts && posts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] text-left text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Published</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {(posts as Pick<BlogPost, "id" | "title" | "slug" | "status" | "published_at" | "updated_at" | "category">[]).map(
                (p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-surface-2)]">
                    <td className="px-4 py-3">
                      <Link href={`/${site.slug}/blog/${p.id}`} className="font-medium hover:underline">
                        {p.title || <span className="italic text-[var(--color-fg-subtle)]">(untitled)</span>}
                      </Link>
                      <div className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ContentStatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-muted)]">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--color-fg-muted)]">
                      {p.published_at ? formatDate(p.published_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatRelative(p.updated_at)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium">No posts yet</p>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Click <em>New post</em> to write your first one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
