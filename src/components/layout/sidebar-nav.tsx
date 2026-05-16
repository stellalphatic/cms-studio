"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The `icon` prop is a pre-rendered ReactNode, not a component. This matters:
 * passing a forwardRef component (every lucide icon) from a Server Component
 * to a Client Component is forbidden in Next 15 because functions aren't
 * serialisable across the RSC boundary. JSX elements ARE serialisable.
 */
export function SidebarNav({
  href,
  icon,
  label,
  exact,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <li className="relative">
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-r-full bg-[var(--color-brand)]"
        />
      )}
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] transition-colors",
          active
            ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
            : "text-[var(--color-fg)]/85 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
        )}
      >
        <span
          className={cn(
            "inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center transition-colors [&_svg]:h-[15px] [&_svg]:w-[15px]",
            active
              ? "text-[var(--color-fg)]"
              : "text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg)]",
          )}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
