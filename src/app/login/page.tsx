import Link from "next/link";
import { LoginForm } from "./login-form";
import { StudioMark } from "@/components/brand/studio-mark";
import { SiteLogo } from "@/components/brand/site-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getWhitelabelSite } from "@/lib/host";

export const metadata = { title: "Sign in" };

async function profileCount(): Promise<number> {
  try {
    const sb = createSupabaseAdminClient();
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const hasAnyUsers = (await profileCount()) > 0;
  const whitelabel = await getWhitelabelSite();

  // On a whitelabel CMS host (e.g. cms.searchhub.digital), wear the client's
  // brand on the intro panel instead of the Studio brand. The right-side form
  // remains neutral so login UX is consistent.
  const brandName = whitelabel?.name ?? "Studio";
  const brandTagline =
    whitelabel?.brand?.tagline ??
    "One quiet place to write, review, and ship every site you operate.";

  return (
    <div
      className="min-h-svh grid lg:grid-cols-[1.05fr_minmax(0,1fr)] bg-[var(--color-bg)]"
      style={
        whitelabel?.brand?.primary
          ? ({ "--color-brand": whitelabel.brand.primary } as React.CSSProperties)
          : undefined
      }
    >
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)] px-12 py-12 lg:flex">
        <div className="flex items-center gap-3">
          {whitelabel ? (
            <SiteLogo
              logoUrl={whitelabel.brand?.logo}
              domain={whitelabel.primary_domain}
              primary={whitelabel.brand?.primary}
              size={40}
              rounded="md"
            />
          ) : (
            <StudioMark size={36} />
          )}
          <div className="leading-tight">
            <div
              className="text-base font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              {brandName}
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              {whitelabel ? "Content workspace" : "Editorial CMS"}
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <p
            className="text-[28px] leading-[1.2] tracking-tight text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {brandTagline}
          </p>
          {!whitelabel && (
            <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-[var(--color-fg-muted)]">
              A multi-site CMS built for small teams that move fast: write in a
              focused canvas, triage the inbox like an email client, hand keys to
              a client without giving up the wheel.
            </p>
          )}
        </div>

        {!whitelabel && (
          <ul className="space-y-2.5 text-[13px] text-[var(--color-fg-muted)]">
            <li className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-[var(--color-fg-subtle)]">01</span>
              <span>Editorial editor with serif type and live preview</span>
            </li>
            <li className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-[var(--color-fg-subtle)]">02</span>
              <span>Per-site Resend, Turnstile, and submission inbox</span>
            </li>
            <li className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-[var(--color-fg-subtle)]">03</span>
              <span>Public API keys, white-label subdomains, role-based teams</span>
            </li>
          </ul>
        )}
        {whitelabel && (
          <p className="text-[12px] text-[var(--color-fg-subtle)]">
            Powered by Studio
          </p>
        )}
      </aside>

      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            {whitelabel ? (
              <SiteLogo
                logoUrl={whitelabel.brand?.logo}
                domain={whitelabel.primary_domain}
                primary={whitelabel.brand?.primary}
                size={36}
                rounded="md"
              />
            ) : (
              <StudioMark size={36} />
            )}
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              {brandName}
            </span>
          </div>

          {!hasAnyUsers && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-[oklch(0.85_0.12_80)] bg-[var(--tone-warn-bg)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--tone-warn-fg)]"
            >
              <div className="mb-0.5 font-semibold tracking-tight">First-run setup</div>
              The first account you create becomes platform super-admin and owner
              of every site. Use the <strong>Create account</strong> tab below.
            </div>
          )}

          <LoginForm searchParamsPromise={searchParams} allowSignup={!hasAnyUsers} />

          <p className="mt-6 text-[12.5px] text-[var(--color-fg-subtle)]">
            Forgot password?{" "}
            <Link className="text-[var(--color-fg-muted)] underline underline-offset-2 hover:text-[var(--color-fg)]" href="/forgot-password">
              Reset it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
