import Link from "next/link";
import { PenLine, FileText } from "lucide-react";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
import { formatDate, formatRelative } from "@/lib/utils";
import type { BlogPost } from "@/lib/supabase/types";
import { StatusToggle } from "./status-toggle";

export const metadata = { title: "Blog" };

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const canEdit = hasRole(role, "editor");
  const supabase = await createSupabaseServerClient();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, status, published_at, updated_at, category, author:authors(name, avatar_url)",
    )
    .eq("site_id", site.id)
    .order("updated_at", { ascending: false });

  type Row = Pick<
    BlogPost,
    "id" | "title" | "slug" | "status" | "published_at" | "updated_at" | "category"
  > & {
    author: { name: string; avatar_url: string | null } | null;
  };
  const list = (posts as unknown as Row[]) ?? [];

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
              <TH>Author</TH>
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
                  <StatusToggle
                    siteSlug={siteSlug}
                    postId={p.id}
                    postTitle={p.title}
                    status={p.status}
                    canEdit={canEdit}
                  />
                </TD>
                <TD>
                  {p.author ? (
                    <span className="inline-flex items-center gap-2">
                      {p.author.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.author.avatar_url}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                        />
                      ) : (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-surface-2)] text-[9px] font-semibold text-[var(--color-fg-muted)]">
                          {p.author.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-[12.5px] text-[var(--color-fg)]">{p.author.name}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--color-fg-subtle)]">—</span>
                  )}
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
