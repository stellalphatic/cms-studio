import Link from "next/link";
import { ArrowUpRight, FileText, Inbox, Image as ImageIcon } from "lucide-react";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const [{ count: postCount }, { count: caseCount }, { count: newSubmissions }, { data: recentPosts }, { data: recentSubmissions }] =
    await Promise.all([
      supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("site_id", site.id),
      supabase.from("case_studies").select("id", { count: "exact", head: true }).eq("site_id", site.id),
      supabase
        .from("form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("site_id", site.id)
        .eq("status", "new"),
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{site.brand?.tagline}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Blog posts" value={postCount ?? 0} href={`/${site.slug}/blog`} icon={FileText} />
        <Stat label="Case studies" value={caseCount ?? 0} href={`/${site.slug}/case-studies`} icon={FileText} />
        <Stat
          label="New submissions"
          value={newSubmissions ?? 0}
          href={`/${site.slug}/forms`}
          icon={Inbox}
          accent={(newSubmissions ?? 0) > 0}
        />
        <Stat label="Media" value="—" href={`/${site.slug}/media`} icon={ImageIcon} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recently edited"
          action={{ href: `/${site.slug}/blog`, label: "All posts" }}
        >
          {recentPosts?.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/${site.slug}/blog/${p.id}`} className="block truncate text-sm font-medium hover:underline">
                      {p.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">{formatRelative(p.updated_at)}</div>
                  </div>
                  <StatusPill status={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty label="No posts yet — create your first one." />
          )}
        </Panel>

        <Panel title="Submission inbox" action={{ href: `/${site.slug}/forms`, label: "Open inbox" }}>
          {recentSubmissions?.length ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentSubmissions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {(s.payload as Record<string, string>)?.name ??
                        (s.payload as Record<string, string>)?.email ??
                        s.form_name}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">
                      {s.form_name} · {formatRelative(s.created_at)}
                    </div>
                  </div>
                  <SubmissionPill status={s.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty label="Nothing here yet. Submissions from your contact forms will appear in real time." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-border-strong)] hover:shadow-sm"
    >
      <div>
        <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-[var(--color-brand)]" : ""}`}>
          {value}
        </div>
      </div>
      <Icon className="h-5 w-5 text-[var(--color-fg-subtle)] transition group-hover:text-[var(--color-fg)]" />
    </Link>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={action.href} className="inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
          {action.label} <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-[var(--color-fg-subtle)]">{label}</p>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-stone-100 text-stone-700",
    scheduled: "bg-amber-100 text-amber-800",
    published: "bg-emerald-100 text-emerald-800",
    archived: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

function SubmissionPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-indigo-100 text-indigo-800",
    in_progress: "bg-blue-100 text-blue-800",
    contacted: "bg-emerald-100 text-emerald-800",
    closed: "bg-stone-100 text-stone-600",
    spam: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? map.new}`}>
      {status.replace("_", " ")}
    </span>
  );
}
