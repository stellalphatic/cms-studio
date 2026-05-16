import Link from "next/link";
import {
  BarChart3,
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
  return (
    <aside className="border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-14 items-center gap-3 px-4 border-b border-[var(--color-border)]">
        <div
          className="grid h-8 w-8 place-items-center rounded-md text-xs font-semibold text-white"
          style={{ background: site.brand?.primary ?? "#4f46e5" }}
        >
          {site.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">{site.name}</div>
          <div className="truncate text-[11px] text-[var(--color-fg-muted)]">{site.primary_domain ?? site.slug}</div>
        </div>
      </div>

      <nav className="space-y-6 px-3 py-5 text-sm">
        <Section label="Overview">
          <NavItem href={`/${site.slug}`} icon={LayoutDashboard} label="Dashboard" />
          <NavItem href={`/${site.slug}/forms`} icon={Inbox} label="Submissions" />
        </Section>

        <Section label="Content">
          {schema?.contentTypes.map((ct) => {
            const Icon = ICONS[ct.icon as keyof typeof ICONS] ?? FileText;
            const route = CONTENT_TYPE_ROUTES[ct.key] ?? ct.key;
            return (
              <NavItem
                key={ct.key}
                href={`/${site.slug}/${route}`}
                icon={Icon}
                label={ct.pluralLabel}
              />
            );
          })}
          <NavItem href={`/${site.slug}/media`} icon={ImageIcon} label="Media" />
        </Section>

        {hasRole(role, "admin") && (
          <Section label="Manage">
            <NavItem href={`/${site.slug}/people`} icon={Users} label="People" />
            <NavItem href={`/${site.slug}/api-keys`} icon={KeyRound} label="API Keys" />
            <NavItem href={`/${site.slug}/settings`} icon={Settings} label="Settings" />
          </Section>
        )}
      </nav>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[var(--color-fg)] transition hover:bg-[var(--color-surface-2)]"
      >
        <Icon className="h-4 w-4 text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg)]" />
        <span>{label}</span>
      </Link>
    </li>
  );
}
