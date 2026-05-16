"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({
  href,
  icon: Icon,
  label,
  exact,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
        <Icon
          className={cn(
            "h-[15px] w-[15px] transition-colors",
            active ? "text-[var(--color-fg)]" : "text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg)]",
          )}
        />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
