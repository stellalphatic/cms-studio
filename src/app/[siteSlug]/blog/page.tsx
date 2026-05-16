import Link from "next/link";
import { PenLine, FileText } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ContentStatusPill } from "@/components/ui/status-pill";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
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

  const list =
    (posts as Pick<
      BlogPost,
      "id" | "title" | "slug" | "status" | "published_at" | "updated_at" | "category"
    >[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Articles, insights, and announcements that publish to the site."
        action={
          <Link href={`/${site.slug}/blog/new`}>
            <Button>
              <PenLine className="h-4 w-4" /> Write a post
            </Button>
          </Link>
        }
      />

      {list.length > 0 ? (
        <DataTable>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Category</TH>
              <TH align="right">Published</TH>
              <TH align="right">Updated</TH>
            </TR>
          </THead>
          <TBody>
            {list.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link
                    href={`/${site.slug}/blog/${p.id}`}
                    className="block text-[14px] font-medium text-[var(--color-fg)] hover:underline underline-offset-4"
                    style={{ fontFamily: "var(--font-serif), serif" }}
                  >
                    {p.title || (
                      <span className="italic text-[var(--color-fg-subtle)]">(untitled)</span>
                    )}
                  </Link>
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">
                    /{p.slug}
                  </div>
                </TD>
                <TD>
                  <ContentStatusPill status={p.status} />
                </TD>
                <TD muted>{p.category ?? "—"}</TD>
                <TD muted align="right" mono>
                  {p.published_at ? formatDate(p.published_at) : "—"}
                </TD>
                <TD muted align="right" mono>
                  {formatRelative(p.updated_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Empty
            icon={FileText}
            title="No posts yet"
            hint="A post is just a title and a paragraph. Start one, save a draft, finish it tomorrow."
            action={
              <Link href={`/${site.slug}/blog/new`}>
                <Button>
                  <PenLine className="h-4 w-4" /> Write your first post
                </Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
