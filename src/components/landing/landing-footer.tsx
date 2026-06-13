import Link from "next/link";
import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
import { StudioWordmark } from "@/components/brand/studio-mark";
import { FOOTER_COLUMNS, FOOTER_STACK } from "./landing-data";
import { LandingThemeToggle } from "./landing-theme-toggle";
import "./landing.css";

const GITHUB_REPO = "https://github.com/stellaphatic/cms-studio";

function FooterLinkItem({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className = "landing-footer-link";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
      {external ? <ArrowUpRight className="landing-footer-link-icon" aria-hidden /> : null}
    </a>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* CTA strip */}
        <div className="landing-footer-cta landing-card">
          <div className="landing-footer-cta-copy">
            <p className="landing-eyebrow">Start building</p>
            <p
              className="landing-footer-cta-title"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              Your first workspace is one sign-in away.
            </p>
            <p className="landing-muted mt-2 max-w-md text-[14px] leading-relaxed">
              Self-host on the free plan or try Agency for 14 days — every account
              starts as platform super-admin.
            </p>
          </div>
          <div className="landing-footer-cta-actions">
            <Link
              href="/login"
              className="landing-btn landing-btn-primary inline-flex h-10 items-center justify-center gap-2 px-5 text-[14px] font-medium tracking-tight"
            >
              Open Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="landing-btn landing-btn-secondary inline-flex h-10 items-center justify-center px-5 text-[14px] font-medium tracking-tight"
            >
              View pricing
            </a>
          </div>
        </div>

        {/* Main grid */}
        <div className="landing-footer-grid">
          <div className="landing-footer-brand-col">
            <Link href="/" className="inline-flex rounded-md outline-offset-4">
              <StudioWordmark size={28} />
            </Link>
            <p className="landing-muted mt-5 max-w-xs text-[14px] leading-relaxed">
              Multi-site editorial CMS and operations dashboard — one control plane
              for every brand you operate.
            </p>
            <ul className="landing-footer-stack mt-5" aria-label="Tech stack">
              {FOOTER_STACK.map((item) => (
                <li key={item} className="landing-footer-stack-pill">
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-github mt-6"
            >
              <Github className="h-4 w-4" aria-hidden />
              <span>stellaphatic/cms-studio</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </a>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} className="landing-footer-col" aria-label={column.title}>
              <p className="landing-footer-heading">{column.title}</p>
              <ul className="landing-footer-links">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem {...link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="landing-footer-bottom">
          <div className="landing-footer-legal">
            <p className="landing-footer-copy">
              &copy; {year} Studio. Built by{" "}
              <a
                href="https://fousventures.com"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link landing-footer-link--inline"
              >
                FOUS Ventures
              </a>
              .
            </p>
            <p className="landing-footer-tagline landing-muted">
              Static sites. Editorial craft. One workspace.
            </p>
          </div>

          <div className="landing-footer-bottom-actions">
            <LandingThemeToggle />
            <a href="#" className="landing-footer-back-top landing-footer-link">
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
