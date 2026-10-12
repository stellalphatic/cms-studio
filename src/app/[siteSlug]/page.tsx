import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Inbox,
  Image as ImageIcon,
  MonitorPlay,
  PenLine,
  Plus,
} from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import {
  ContentStatusPill,
  SubmissionStatusPill,
  WebinarPaymentPill,
} from "@/components/ui/status-pill";
import { Empty } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import type { WebinarPaymentStatus } from "@/lib/supabase/types";

type SubmissionPayload = Record<string, string | undefined>;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const isKingsbridge = site.slug === "kingsbridge";

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

  let webinarTotal = 0;
  let webinarPaid = 0;
  let webinarUnpaid = 0;
  let recentWebinar: Array<{
    id: string;
    name: string;
    email: string;
    payment_status: WebinarPaymentStatus;
    created_at: string;
  }> = [];
  let webinarTableMissing = false;

  if (isKingsbridge) {
    const [totalRes, paidRes, unpaidRes, recentRes] = await Promise.all([
      supabase
        .from("webinar_registrations")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id),
      supabase
        .from("webinar_registrations")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("payment_status", "paid"),
      supabase
        .from("webinar_registrations")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("payment_status", "unpaid"),
      supabase
        .from("webinar_registrations")
        .select("id, name, email, payment_status, created_at")
        .eq("site_id", site.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const missing =
      Boolean(totalRes.error?.message?.includes("webinar_registrations")) ||
      Boolean(totalRes.error?.code === "42P01") ||
      Boolean(totalRes.error?.message?.toLowerCase().includes("schema cache"));

    webinarTableMissing = missing;
    webinarTotal = totalRes.count ?? 0;
    webinarPaid = paidRes.count ?? 0;
    webinarUnpaid = unpaidRes.count ?? 0;
    recentWebinar = (recentRes.data ?? []) as typeof recentWebinar;
  }

  const tagline = site.brand?.tagline;
  const inboxCount = newSubmissions ?? 0;
  const drafts = draftPosts ?? 0;
  const focusItems = focusList({
    inboxCount,
    drafts,
    webinarUnpaid: isKingsbridge ? webinarUnpaid : 0,
  });

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
          {isKingsbridge && (
            <Link href={`/${site.slug}/webinar`}>
              <Button size="md" variant="secondary">
                <MonitorPlay className="h-4 w-4" />
                Webinar
                {webinarUnpaid > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10.5px] font-semibold text-white tabular">
                    {webinarUnpaid}
                  </span>
                )}
              </Button>
            </Link>
          )}
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

      {isKingsbridge && webinarTableMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <strong>Webinar table not migrated yet.</strong> Run{" "}
          <code className="font-mono text-[12px]">0009_webinar_registrations.sql</code> in the
          Supabase SQL editor (or set <code className="font-mono text-[12px]">DATABASE_URL</code>{" "}
          and use the apply script). Until then, Reserve on the live site cannot save seats.
        </div>
      )}

      {isKingsbridge && !webinarTableMissing && (
        <section>
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            Webinar ($1 seats)
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
            <Stat
              label="Registrations"
              total={webinarTotal}
              href={`/${site.slug}/webinar`}
              icon={MonitorPlay}
            />
            <Stat
              label="Paid"
              total={webinarPaid}
              href={`/${site.slug}/webinar?status=paid`}
              icon={MonitorPlay}
            />
            <Stat
              label="Unpaid"
              total={webinarUnpaid}
              sub="waiting on Stripe"
              href={`/${site.slug}/webinar?status=unpaid`}
              icon={MonitorPlay}
            />
          </div>
        </section>
      )}

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

      {isKingsbridge && !webinarTableMissing && (
        <section>
          <Panel
            title="Latest webinar reservations"
            eyebrow="Webinar"
            action={{ href: `/${site.slug}/webinar`, label: "All registrants" }}
          >
            {recentWebinar.length ? (
              <ul className="divide-y divide-[var(--color-border)]">
                {recentWebinar.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/${site.slug}/webinar/${r.id}`}
                        className="block truncate text-[13.5px] font-medium hover:underline underline-offset-4"
                      >
                        {r.name}
                      </Link>
                      <div className="mt-0.5 font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
                        {r.email} · {formatRelative(r.created_at)}
                      </div>
                    </div>
                    <WebinarPaymentPill status={r.payment_status} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title="No webinar seats yet"
                hint="When someone reserves on /webinar or /shabbeers-webinar, they appear here."
                icon={MonitorPlay}
              />
            )}
          </Panel>
        </section>
      )}
    </div>
  );
}

function focusList({
  inboxCount,
  drafts,
  webinarUnpaid = 0,
}: {
  inboxCount: number;
  drafts: number;
  webinarUnpaid?: number;
}) {
  const items: Array<{ count: number | string; label: string; hint: string; href: string }> = [];
  if (webinarUnpaid > 0) {
    items.push({
      count: webinarUnpaid,
      label: `Unpaid webinar seat${webinarUnpaid === 1 ? "" : "s"}`,
      hint: "They reserved but have not completed the $1 Stripe payment yet.",
      href: "/webinar?status=unpaid",
    });
  }
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
