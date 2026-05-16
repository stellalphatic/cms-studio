"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const PRETTY: Record<string, string> = {
  blog: "Blog",
  "case-studies": "Case studies",
  testimonials: "Testimonials",
  faqs: "FAQs",
  pages: "Pages",
  pathways: "Pathways",
  pricing: "Pricing",
  "bulk-tiers": "Bulk tiers",
  services: "Services",
  forms: "Submissions",
  media: "Media",
  people: "People",
  "api-keys": "API keys",
  settings: "Settings",
  new: "New",
};

/**
 * Mini breadcrumb derived from the URL — runs client-side so the topbar
 * adapts as you navigate (no server round-trip). Skips the workspace slug
 * and the route parameter (always a UUID).
 */
export function SectionCrumb({ siteSlug }: { siteSlug: string }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== siteSlug || parts.length < 2) return null;

  const section = parts[1];
  const sub = parts[2];

  const sectionHref = `/${siteSlug}/${section}`;
  const sectionLabel = PRETTY[section] ?? section.replace(/-/g, " ");

  const isUuid = (v?: string) => /^[0-9a-f]{8}-/.test(v ?? "");
  const subLabel = sub && !isUuid(sub) ? (PRETTY[sub] ?? sub) : isUuid(sub) ? "Edit" : null;

  return (
    <nav className="hidden items-center gap-1.5 text-[12.5px] md:flex">
      <ChevronRight className="h-3 w-3 text-[var(--color-fg-subtle)]" />
      <Link
        href={sectionHref}
        className="capitalize text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        {sectionLabel}
      </Link>
      {subLabel && (
        <>
          <ChevronRight className="h-3 w-3 text-[var(--color-fg-subtle)]" />
          <span className="text-[var(--color-fg)]">{subLabel}</span>
        </>
      )}
    </nav>
  );
}
