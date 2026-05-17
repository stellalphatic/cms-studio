"use client";

import { useState } from "react";
import { StudioMark } from "./studio-mark";

/**
 * Sidebar / workspace identifier mark.
 *
 * Priority:
 *   1. Explicit `brand.logo` URL set in Studio settings (best — branded).
 *   2. Google's free favicon proxy for the site's primary_domain
 *      (https://www.google.com/s2/favicons?domain=…&sz=64). Works for
 *      virtually every site; resilient when DNS is up. Falls back gracefully.
 *   3. A small inline StudioMark on top of the site's primary brand color —
 *      reads as "made in Studio" rather than the generic single-letter chip.
 *
 * Client component because <img onError> needs to swap the fallback.
 */
export function SiteLogo({
  logoUrl,
  domain,
  primary,
  size = 36,
  rounded = "md",
  className,
}: {
  logoUrl?: string | null;
  domain?: string | null;
  primary?: string | null;
  size?: number;
  rounded?: "md" | "lg" | "full";
  className?: string;
}) {
  const [explicitFailed, setExplicitFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);

  const radiusClass = rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md";
  const dimension = { width: size, height: size };

  const cleanDomain = (domain ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");
  const faviconUrl = cleanDomain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=${Math.max(64, size * 2)}`
    : null;

  // 1. Explicit logo
  if (logoUrl && !explicitFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        style={dimension}
        onError={() => setExplicitFailed(true)}
        className={`${radiusClass} shrink-0 object-cover ring-1 ring-[var(--color-border)] ${className ?? ""}`}
      />
    );
  }

  // 2. Google favicon proxy
  if (faviconUrl && !faviconFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={faviconUrl}
        alt=""
        style={dimension}
        loading="lazy"
        onError={() => setFaviconFailed(true)}
        className={`${radiusClass} shrink-0 bg-[var(--color-surface-2)] object-contain p-1 ring-1 ring-[var(--color-border)] ${className ?? ""}`}
      />
    );
  }

  // 3. StudioMark on the site's brand color
  return (
    <span
      className={`${radiusClass} relative grid shrink-0 place-items-center overflow-hidden ring-1 ring-[var(--color-border)] ${className ?? ""}`}
      style={{
        ...dimension,
        background: primary || "oklch(0.94 0.005 80)",
      }}
    >
      <StudioMark size={Math.max(14, Math.round(size * 0.62))} />
    </span>
  );
}
