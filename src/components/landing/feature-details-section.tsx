import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURE_DETAILS } from "./landing-data";
import { SectionHead } from "./section-head";

const FEATURE_METRICS = [
  { value: "6", label: "core modules" },
  { value: "24+", label: "capabilities" },
  { value: "1", label: "control plane" },
] as const;

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURE_DETAILS)[number];
  index: number;
}) {
  const wide = feature.featured;

  return (
    <article
      id={`feature-${index + 1}`}
      className={cn(
        "landing-card landing-card-interactive landing-feature-card group",
        wide && "landing-feature-card--wide lg:col-span-2",
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col",
          wide && "lg:flex-row lg:items-stretch lg:gap-0",
        )}
      >
        {/* Icon panel */}
        <div
          className={cn(
            "landing-feature-icon-panel flex shrink-0 flex-col justify-between p-6 sm:p-7",
            wide ? "lg:w-[14.5rem] lg:border-r lg:border-[var(--landing-border)]" : "",
          )}
        >
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="landing-feature-category">{feature.category}</span>
              <span className="landing-feature-index">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="landing-feature-icon-hero">
              <feature.icon className="h-6 w-6" strokeWidth={1.75} />
            </div>
          </div>
          {!wide && (
            <div
              className="landing-feature-index-bar mt-6 hidden h-1 w-full sm:block"
              aria-hidden
            />
          )}
        </div>

        {/* Content */}
        <div className={cn("flex flex-1 flex-col p-6 sm:p-7", wide && "lg:py-8")}>
          <h3
            className="text-[1.125rem] font-semibold leading-snug tracking-tight sm:text-[1.2rem]"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {feature.title}
          </h3>
          <p className="landing-muted mt-3 text-[15px] leading-relaxed">{feature.summary}</p>

          <div className="landing-feature-bullets mt-6 flex-1">
            <p className="landing-eyebrow mb-3 text-[0.6875rem]">Includes</p>
            <ul className={cn("grid gap-3", wide ? "sm:grid-cols-2" : "gap-2.5")}>
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="landing-feature-bullet flex items-start gap-2.5">
                  <span className="landing-feature-check mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-[var(--color-fg)]">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeatureDetailsSection() {
  const categories = [...new Set(FEATURE_DETAILS.map((f) => f.category))];

  return (
    <section id="features" className="landing-features-shell scroll-mt-24 px-6 lg:px-8">
      <div className="mx-auto max-w-6xl py-16 lg:py-24">
        <SectionHead
          center
          eyebrow="Feature deep dive"
          title="Built for how agencies"
          titleMuted="actually ship sites."
          lead="Every workspace gets a full editorial stack, operations tooling, and a deploy pipeline — without spinning up new infrastructure per client."
        />

        {/* Metrics strip */}
        <div className="landing-features-metrics mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3">
          {FEATURE_METRICS.map((m) => (
            <div key={m.label} className="landing-card landing-features-metric text-center">
              <div className="landing-features-metric-value">{m.value}</div>
              <div className="landing-eyebrow mt-1.5 text-[0.625rem]">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Category legend */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <span key={cat} className="landing-feature-legend-pill">
              {cat}
            </span>
          ))}
        </div>

        {/* Bento grid */}
        <div className="landing-features-bento mt-12 grid gap-4 sm:gap-5 lg:grid-cols-2">
          {FEATURE_DETAILS.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
