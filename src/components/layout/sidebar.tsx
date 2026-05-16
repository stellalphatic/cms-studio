import Link from "next/link";
import {
  BarChart3,
  ChevronsUpDown,
  DollarSign,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  Layers,
  Layout as LayoutIcon,
  LayoutDashboard,
  Quote,
  Route,
  Settings,
  Users,
} from "lucide-react";
import { hasRole } from "@/lib/auth";
import type { SiteSchema } from "@/lib/schemas";
import type { Site, SiteRole } from "@/lib/supabase/types";
import { SidebarNav } from "./sidebar-nav";

const ICONS = {
  FileText,
  BarChart3,
  Quote,
  HelpCircle,
  Layers,
  Layout: LayoutIcon,
  Route,
  DollarSign,
} as const;

const CONTENT_TYPE_ROUTES: Record<string, string> = {
  blog_posts: "blog",
  case_studies: "case-studies",
  testimonials: "testimonials",
  faqs: "faqs",
  pages: "pages",
  immigration_pathways: "pathways",
  pricing_tiers: "pricing",
  bulk_tiers: "bulk-tiers",
  services: "services",
};

export function Sidebar({
  site,
  schema,
  role,
}: {
  site: Site;
  schema?: SiteSchema;
  role: SiteRole;
}) {
  const initials = site.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const logo = site.brand?.logo;

  return (
    <aside className="sticky top-0 z-30 flex h-svh flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Workspace identifier — clickable, opens the switcher in the topbar
          via simple link to /workspaces for now. */}
      <Link
        href="/workspaces"
        className="group flex h-16 items-center gap-3 border-b border-[var(--color-border)] px-5 transition hover:bg-[var(--color-surface-2)]/60"
        title="Switch workspace"
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
          />
        ) : (
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[11px] font-semibold tracking-wider text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]"
            style={{ background: site.brand?.primary ?? "oklch(0.55 0.2 275)" }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-[14px] font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {site.name}
          </div>
          <div className="truncate font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
            {site.primary_domain ?? site.slug}
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-fg-subtle)] opacity-60 transition group-hover:opacity-100" />
      </Link>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        <Section label="Overview">
          <SidebarNav href={`/${site.slug}`} icon={LayoutDashboard} label="Dashboard" exact />
          <SidebarNav href={`/${site.slug}/forms`} icon={Inbox} label="Submissions" />
        </Section>

        <Section label="Content">
          {schema?.contentTypes.map((ct) => {
            const Icon = ICONS[ct.icon as keyof typeof ICONS] ?? FileText;
            const route = CONTENT_TYPE_ROUTES[ct.key] ?? ct.key;
            return (
              <SidebarNav
                key={ct.key}
                href={`/${site.slug}/${route}`}
                icon={Icon}
                label={ct.pluralLabel}
              />
            );
          })}
          <SidebarNav href={`/${site.slug}/media`} icon={ImageIcon} label="Media" />
        </Section>

        {hasRole(role, "admin") && (
          <Section label="Manage">
            <SidebarNav href={`/${site.slug}/people`} icon={Users} label="People" />
            <SidebarNav href={`/${site.slug}/api-keys`} icon={KeyRound} label="API keys" />
            <SidebarNav href={`/${site.slug}/settings`} icon={Settings} label="Settings" />
          </Section>
        )}
      </nav>

      <div className="border-t border-[var(--color-border)] px-5 py-3 text-[11px] text-[var(--color-fg-subtle)]">
        <span className="font-mono uppercase tracking-wider">{role}</span>
        <span className="mx-1.5">·</span>
        <Link href="/workspaces" className="hover:text-[var(--color-fg)]">
          Switch workspace
        </Link>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="px-3 pb-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <ul className="space-y-px">{children}</ul>
    </div>
  );
}
