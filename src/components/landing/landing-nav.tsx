"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioWordmark } from "@/components/brand/studio-mark";
import { LandingThemeToggle } from "./landing-theme-toggle";
import { cn } from "@/lib/utils";
import "./landing.css";

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "landing-nav fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled && "landing-nav--scrolled",
      )}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="rounded-md outline-offset-4">
          <StudioWordmark size={28} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="landing-nav-link rounded-md px-3.5 py-2 text-[13px] font-medium tracking-tight"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LandingThemeToggle />
          <Link
            href="/login"
            className="landing-btn landing-muted hidden px-3.5 py-2 text-[13px] font-medium transition hover:text-[var(--color-fg)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="landing-btn landing-btn-primary inline-flex h-9 items-center justify-center px-4 text-[13px] font-medium tracking-tight"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
