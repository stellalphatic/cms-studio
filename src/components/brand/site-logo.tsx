"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioMark } from "./studio-mark";

/**
 * Workspace logo with a hardened, multi-step fallback chain. The goal is
 * "never render a broken image" — every step has its own onError that
 * advances to the next, and the final step is an inline SVG that cannot
 * fail to render.
 *
 *   1. Explicit `brand.logo` if it's an absolute https URL or a real
 *      path that lives on this Studio (e.g. an uploaded media URL).
 *   2. Google's favicon proxy for the site's primary_domain. Returns 200
 *      with a tiny PNG for virtually any live site.
 *   3. Inline StudioMark on the site's brand color — branded, recognisable,
 *      definitely not a generic letter chip.
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
  type Stage = "explicit" | "favicon" | "mark";
  const radiusClass =
    rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md";
  const dimension = { width: size, height: size };

  const cleanDomain = (domain ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "")
    .trim();

  // Only honour absolute https URLs for the explicit logo. Relative paths
  // ("/brands/foo.svg") would resolve to the Studio host and 404, leaving
  // a broken-image icon. Skip straight to favicon when that happens.
  const explicitUrl = useMemo(() => {
    if (!logoUrl) return null;
    const v = logoUrl.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    return null;
  }, [logoUrl]);

  const faviconUrl = cleanDomain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        cleanDomain,
      )}&sz=${Math.max(64, size * 2)}`
    : null;

  const initialStage: Stage = explicitUrl ? "explicit" : faviconUrl ? "favicon" : "mark";
  const [stage, setStage] = useState<Stage>(initialStage);

  // Reset stage when the logo / domain changes (Next caches client trees
  // and re-uses them across workspace switches).
  useEffect(() => {
    setStage(initialStage);
  }, [initialStage]);

  function nextStage() {
    setStage((current) => {
      if (current === "explicit" && faviconUrl) return "favicon";
      return "mark";
    });
  }

  const baseClasses = `${radiusClass} shrink-0 ring-1 ring-[var(--color-border)] ${className ?? ""}`;

  if (stage === "explicit" && explicitUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={explicitUrl}
        src={explicitUrl}
        alt=""
        style={dimension}
        onError={nextStage}
        className={`${baseClasses} object-cover`}
      />
    );
  }

  if (stage === "favicon" && faviconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={faviconUrl}
        src={faviconUrl}
        alt=""
        style={dimension}
        loading="lazy"
        onError={nextStage}
        className={`${baseClasses} bg-[var(--color-surface-2)] object-contain p-1`}
      />
    );
  }

  // Final fallback — inline SVG, can't fail to render.
  return (
    <span
      className={`${baseClasses} relative grid place-items-center overflow-hidden`}
      style={{
        ...dimension,
        background: primary || "oklch(0.94 0.005 80)",
      }}
    >
      <StudioMark size={Math.max(14, Math.round(size * 0.62))} />
    </span>
  );
}
