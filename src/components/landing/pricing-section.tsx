import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING_FAQ, PRICING_PLANS } from "./landing-data";
import { SectionHead } from "./section-head";

export function PricingSection() {
  return (
    <section id="pricing" className="landing-section scroll-mt-24 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          center
          eyebrow="Pricing"
          title="Simple plans that scale"
          titleMuted="with your portfolio."
          lead="Start free with self-hosting. Upgrade when you're running multiple client workspaces and need white-label, deploy automation, and priority support."
        />

        <div className="mt-16 grid gap-4 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={[
                "landing-card landing-pricing-card flex flex-col p-6 sm:p-7",
                plan.highlighted ? "landing-pricing-card--featured" : "",
              ].join(" ")}
            >
              {plan.highlighted ? (
                <span className="landing-pricing-badge landing-eyebrow mb-4 inline-flex w-fit px-2 py-0.5">
                  Most popular
                </span>
              ) : (
                <span className="mb-4 block h-[1.625rem]" aria-hidden />
              )}

              <h3
                className="text-[1.125rem] font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-serif), serif" }}
              >
                {plan.name}
              </h3>
              <p className="landing-muted mt-2 text-[13.5px] leading-relaxed">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="landing-pricing-amount">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className="landing-muted text-[13px]">/ {plan.period}</span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13.5px]">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]"
                      strokeWidth={2.5}
                    />
                    <span className="landing-muted leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={[
                  "landing-btn mt-8 inline-flex h-11 w-full items-center justify-center text-[14px] font-medium tracking-tight",
                  plan.highlighted ? "landing-btn-primary" : "landing-btn-secondary",
                ].join(" ")}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PRICING_FAQ.map((item) => (
            <div key={item.q} className="landing-card p-5">
              <h4 className="text-[14px] font-semibold tracking-tight">{item.q}</h4>
              <p className="landing-muted mt-2 text-[13px] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
