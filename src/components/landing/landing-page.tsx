import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { FeatureDetailsSection } from "./feature-details-section";
import { LandingFooter } from "./landing-footer";
import { LandingNav } from "./landing-nav";
import { PricingSection } from "./pricing-section";
import { ProductPreview } from "./product-preview";
import { SectionHead } from "./section-head";
import {
  CAPABILITIES,
  PILLARS,
  STATS,
  TRUST_BRANDS,
  WORKFLOW,
} from "./landing-data";
import "./landing.css";

export function LandingPage() {
  return (
    <div className="landing-bg relative min-h-svh overflow-x-hidden">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative px-6 pb-16 pt-[7.5rem] lg:px-8 lg:pb-24 lg:pt-[8.5rem]">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="landing-badge landing-card landing-fade-up mb-7 inline-flex items-center gap-2 px-3.5 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                <span className="landing-eyebrow">Multi-site editorial CMS</span>
              </div>

              <h1
                className="landing-fade-up landing-fade-up-delay-1 text-[clamp(2.35rem,5.8vw,4.25rem)] leading-[1.04] tracking-[-0.03em]"
                style={{ fontFamily: "var(--font-serif), serif" }}
              >
                One quiet place to run
                <span className="landing-accent-text block">every site you operate.</span>
              </h1>

              <p className="landing-lead landing-fade-up landing-fade-up-delay-2 mx-auto mt-7 max-w-2xl text-[17px] sm:text-lg">
                Studio is the control plane for agencies and product teams — editorial
                content, form submissions, deploy pipelines, API keys, and team access
                for every brand you manage, in one obsessively refined workspace.
              </p>

              <div className="landing-fade-up landing-fade-up-delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="landing-btn landing-btn-primary inline-flex h-11 min-w-[11rem] items-center justify-center gap-2 px-6 text-[15px] font-medium tracking-tight"
                >
                  Start editing
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#pricing"
                  className="landing-btn landing-btn-secondary inline-flex h-11 min-w-[11rem] items-center justify-center px-6 text-[15px] font-medium tracking-tight"
                >
                  View pricing
                </a>
              </div>

              <p className="landing-trust landing-fade-up landing-fade-up-delay-3">
                Trusted by teams operating
              </p>
              <div className="landing-trust-brands landing-fade-up landing-fade-up-delay-3">
                {TRUST_BRANDS.map((brand) => (
                  <span key={brand} className="landing-trust-pill">
                    {brand}
                  </span>
                ))}
              </div>
            </div>

            <div className="landing-fade-up landing-fade-up-delay-4 relative isolate mt-16 lg:mt-20">
              <p className="landing-preview-label landing-eyebrow">Live workspace preview</p>
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 pb-8 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="landing-card landing-card-interactive landing-stat">
                <div className="landing-stat-value">{stat.value}</div>
                <div className="landing-eyebrow mt-3">{stat.label}</div>
                <p className="landing-muted mt-2 text-[14px] leading-relaxed">{stat.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform */}
        <section id="platform" className="landing-section scroll-mt-24 px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              center
              eyebrow="Built for operators"
              title="Infrastructure-grade CMS,"
              titleMuted="editorial-grade experience."
              lead="One Supabase project. One Studio app. Every public site stays fully static — fetched at build time, rebuilt when content changes."
            />

            <div className="mt-16 grid gap-4 md:grid-cols-3">
              {PILLARS.map((item) => (
                <article key={item.title} className="landing-card landing-card-interactive group p-7">
                  <div className="landing-icon-wrap mb-5">
                    <item.icon className="h-[18px] w-[18px]" />
                  </div>
                  <h3
                    className="text-[1.125rem] font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-serif), serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="landing-muted mt-3 text-[14px] leading-relaxed">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="landing-section scroll-mt-24 px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <SectionHead
                eyebrow="Content flow"
                title="From draft to live in three deliberate steps."
              />
              <p className="landing-lead max-w-md lg:pb-1">
                Editors stay in Studio. Visitors get blazing static sites. The pipeline
                between them is fully automated.
              </p>
            </div>

            <div className="landing-workflow-grid mt-16 grid gap-4 lg:grid-cols-3">
              {WORKFLOW.map((item) => (
                <article key={item.step} className="landing-card landing-card-interactive p-7">
                  <div className="landing-step-num mb-5">{item.step}</div>
                  <h3
                    className="text-[1.125rem] font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-serif), serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="landing-muted mt-3 text-[14px] leading-relaxed">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="landing-section scroll-mt-24 px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="Capabilities"
              title="Everything your team needs."
              titleMuted="Nothing they don't."
            />

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((item) => (
                <article key={item.title} className="landing-card landing-card-interactive p-6">
                  <div className="landing-cap-icon">
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight">{item.title}</h3>
                  <p className="landing-muted mt-2.5 text-[14px] leading-relaxed">{item.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {item.details.map((detail) => (
                      <li
                        key={detail}
                        className="landing-cap-tag rounded-[var(--landing-radius)] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]"
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <FeatureDetailsSection />
        <PricingSection />

        {/* CTA */}
        <section className="px-6 pb-24 lg:px-8 lg:pb-32">
          <div className="mx-auto max-w-6xl">
            <div className="landing-card landing-cta-gradient relative overflow-hidden px-8 py-14 sm:px-12 sm:py-16 lg:px-16">
              <div className="relative max-w-2xl">
                <p className="landing-eyebrow landing-cta-muted">Ready when you are</p>
                <h2
                  className="landing-cta-text landing-title"
                  style={{ fontFamily: "var(--font-serif), serif" }}
                >
                  Bring every workspace under one roof.
                </h2>
                <p className="landing-cta-muted landing-lead">
                  Start free with self-hosting, or try Agency free for 14 days. The first
                  account you create becomes platform super-admin automatically.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="landing-btn landing-cta-btn-light inline-flex h-11 items-center justify-center gap-2 px-6 text-[15px] font-medium tracking-tight transition hover:opacity-90"
                  >
                    Open Studio
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#pricing"
                    className="landing-btn landing-cta-btn-ghost inline-flex h-11 items-center justify-center px-6 text-[15px] font-medium tracking-tight transition"
                  >
                    Compare plans
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
