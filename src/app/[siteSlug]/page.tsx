import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Inbox,
  Image as ImageIcon,
  PenLine,
  Plus,
} from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { ContentStatusPill, SubmissionStatusPill } from "@/components/ui/status-pill";
import { Empty } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";

type SubmissionPayload = Record<string, string | undefined>;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const [
    { count: postCount },
    { count: caseCount },
    { count: newSubmissions },
    { count: draftPosts },
    { count: publishedPosts },
    { data: recentPosts },
    { data: recentSubmissions },
  ] = await Promise.all([
    supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("site_id", site.id),
    supabase.from("case_studies").select("id", { count: "exact", head: true }).eq("site_id", site.id),
    supabase
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id)
      .eq("status", "new"),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id)
      .eq("status", "draft"),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id)
      .eq("status", "published"),
    supabase
      .from("blog_posts")
      .select("id, title, slug, status, updated_at")
      .eq("site_id", site.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("form_submissions")
      .select("id, form_name, payload, status, created_at")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const tagline = site.brand?.tagline;
  const inboxCount = newSubmissions ?? 0;
  const drafts = draftPosts ?? 0;
  const focusItems = focusList({ inboxCount, drafts });

  return (
    <div className="space-y-12">
      {/* Hero — editorial: serif title, single supporting metric, no
          dashboard-cliché big number band. */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            Workspace
          </div>
          <h1
            className="text-[40px] leading-[1.05] tracking-tight text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {site.name}
          </h1>
          {tagline && (
            <p className="mt-2 max-w-[60ch] text-[14.5px] text-[var(--color-fg-muted)]">{tagline}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/${site.slug}/blog/new`}>
            <Button size="md">
              <PenLine className="h-4 w-4" />
              Write a post
            </Button>
          </Link>
          <Link href={`/${site.slug}/forms`}>
            <Button size="md" variant="secondary">
              Inbox
              {inboxCount > 0 && (
                <span className="ml-1 rounded-full bg-[var(--color-fg)] px-1.5 text-[10.5px] font-semibold text-[var(--color-bg)] tabular">
                  {inboxCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </header>

      {/* What needs you — replaces the SaaS-cliché stat-quad with a directed
          to-do that drives clicks. */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            What needs you
          </h2>
          {focusItems.length === 0 && (
            <span className="text-[12.5px] text-[var(--color-fg-muted)]">All clear, write something.</span>
          )}
        </div>
        {focusItems.length > 0 ? (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {focusItems.map((f) => (
              <li key={f.label}>
                <Link
                  href={`/${site.slug}${f.href}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--color-surface-2)]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className="grid h-10 min-w-10 place-items-center rounded-lg bg-[var(--color-surface-2)] px-2 font-mono text-[15px] font-semibold tabular text-[var(--color-fg)]"
                    >
                      {f.count}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium text-[var(--color-fg)]">
                        {f.label}
                      </div>
                      <div className="mt-0.5 truncate text-[12.5px] text-[var(--color-fg-muted)]">
                        {f.hint}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-[var(--color-fg-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-fg)]" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Empty
              title="Inbox at zero, drafts empty"
              hint="A good time to draft the next piece. Your dashboard updates in real time."
              action={
                <Link href={`/${site.slug}/blog/new`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> New post
                  </Button>
                </Link>
              }
            />
          </div>
        )}
      </section>

      {/* Supporting stats — quiet, varied widths, no equal-card grid */}
      <section>
        <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          Library
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Posts" total={postCount ?? 0} sub={`${publishedPosts ?? 0} live`} href={`/${site.slug}/blog`} icon={FileText} />
          <Stat label="Case studies" total={caseCount ?? 0} href={`/${site.slug}/case-studies`} icon={FileText} />
          <Stat label="Drafts" total={drafts} href={`/${site.slug}/blog?status=draft`} icon={PenLine} />
          <Stat label="Media" total="—" href={`/${site.slug}/media`} icon={ImageIcon} />
        </div>
      </section>

      {/* Two columns: recently edited + submission inbox */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel
          title="Recently edited"
          eyebrow="Blog"
          action={{ href: `/${site.slug}/blog`, label: "All posts" }}
        >
          {recentPosts?.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/${site.slug}/blog/${p.id}`}
                      className="block truncate text-[13.5px] font-medium hover:underline underline-offset-4"
                    >
                      {p.title || "(untitled)"}
                    </Link>
                    <div className="mt-0.5 font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
                      /{p.slug} · {formatRelative(p.updated_at)}
                    </div>
                  </div>
                  <ContentStatusPill status={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="No posts yet"
              hint="Your first article is the hardest. Then it gets easier."
              icon={FileText}
            />
          )}
        </Panel>

        <Panel
          title="Submission inbox"
          eyebrow="Forms"
          action={{ href: `/${site.slug}/forms`, label: "Open inbox" }}
        >
          {recentSubmissions?.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentSubmissions.map((s) => {
                const payload = (s.payload ?? {}) as SubmissionPayload;
                const headline = payload.name || payload.email || s.form_name;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium">{headline}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
                        {s.form_name} · {formatRelative(s.created_at)}
                      </div>
                    </div>
                    <SubmissionStatusPill status={s.status} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty
              title="Inbox empty"
              hint="Form submissions from your live site will land here in seconds."
              icon={Inbox}
            />
          )}
        </Panel>
      </section>
    </div>
  );
}

function focusList({ inboxCount, drafts }: { inboxCount: number; drafts: number }) {
  const items: Array<{ count: number | string; label: string; hint: string; href: string }> = [];
  if (inboxCount > 0) {
    items.push({
      count: inboxCount,
      label: `New submission${inboxCount === 1 ? "" : "s"} to triage`,
      hint: "Open the inbox, route the lead, mark contacted.",
      href: "/forms",
    });
  }
  if (drafts > 0) {
    items.push({
      count: drafts,
      label: `Draft post${drafts === 1 ? "" : "s"} waiting`,
      hint: "Finish them and publish, or archive what's stale.",
      href: "/blog?status=draft",
    });
  }
  return items;
}

function Stat({
  label,
  total,
  sub,
  href,
  icon: Icon,
}: {
  label: string;
  total: number | string;
  sub?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-end justify-between gap-4 bg-[var(--color-surface)] px-5 py-5 transition hover:bg-[var(--color-surface-2)]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="mt-2 text-[28px] font-semibold leading-none tabular tracking-tight text-[var(--color-fg)]">
          {total}
        </div>
        {sub && (
          <div className="mt-1.5 text-[11.5px] text-[var(--color-fg-muted)] tabular">{sub}</div>
        )}
      </div>
      <ArrowUpRight className="h-4 w-4 text-[var(--color-fg-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-fg)]" />
    </Link>
  );
}

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              {eyebrow}
            </div>
          )}
          <h3
            className="text-[15px] font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {title}
          </h3>
        </div>
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          {action.label}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}
