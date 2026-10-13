import Link from "next/link";
import { ArrowUpRight, KeyRound, Plug, Webhook } from "lucide-react";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/surface";
import { CopyBlock } from "./copy-block";

export const metadata = { title: "Integration" };

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);

  if (!hasRole(role, "admin")) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-sm text-[var(--color-fg-muted)]">
        You need admin access to view integration credentials.
      </div>
    );
  }

  const sb = await createSupabaseServerClient();
  const { data: keys } = await sb
    .from("api_keys")
    .select("id, name, prefix, revoked_at")
    .eq("site_id", site.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const studioUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://your-studio.example.com").replace(/\/$/, "");
  const formsUrl = `${studioUrl}/api/v1/sites/${site.slug}/submit-form`;

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const activeKeyCount = keys?.length ?? 0;
  const samplePrefix = keys?.[0]?.prefix ?? "sk_xxxx";

  // Vite (Kingsbridge, SearchHub, Clona)
  const viteEnv = `# ─── Studio CMS — single source of truth ─────────────────────
# Browser-exposed (used by the contact form).
VITE_CMS_URL=${studioUrl}
VITE_CMS_SITE=${site.slug}

# Server-only (used by scripts/fetch-content.ts during build).
CMS_URL=${studioUrl}
CMS_SITE=${site.slug}
CMS_API_KEY=<paste-the-secret-from-API-Keys>

${turnstileSiteKey ? `# Optional: Cloudflare Turnstile (CAPTCHA).\nVITE_TURNSTILE_SITE_KEY=${turnstileSiteKey}` : "# Optional: VITE_TURNSTILE_SITE_KEY=<from Cloudflare Turnstile>"}
`;

  // Astro (Vantage)
  const astroEnv = `# ─── Studio CMS — single source of truth ─────────────────────
# Browser-exposed.
PUBLIC_CMS_URL=${studioUrl}
PUBLIC_CMS_SITE=${site.slug}

# Server-only.
CMS_URL=${studioUrl}
CMS_SITE=${site.slug}
CMS_API_KEY=<paste-the-secret-from-API-Keys>

${turnstileSiteKey ? `# Optional: Cloudflare Turnstile (CAPTCHA).\nPUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}` : "# Optional: PUBLIC_TURNSTILE_SITE_KEY=<from Cloudflare Turnstile>"}
`;

  // Next.js (future sites)
  const nextEnv = `# ─── Studio CMS — single source of truth ─────────────────────
NEXT_PUBLIC_CMS_URL=${studioUrl}
NEXT_PUBLIC_CMS_SITE=${site.slug}
CMS_API_KEY=<paste-the-secret-from-API-Keys>

${turnstileSiteKey ? `# Optional: Cloudflare Turnstile (CAPTCHA).\nNEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}` : "# Optional: NEXT_PUBLIC_TURNSTILE_SITE_KEY=<from Cloudflare Turnstile>"}
`;

  const curlList = `curl -H "Authorization: Bearer ${samplePrefix}…" \\
  ${studioUrl}/api/v1/sites/${site.slug}/blog-posts`;

  const curlSingle = `curl -H "Authorization: Bearer ${samplePrefix}…" \\
  ${studioUrl}/api/v1/sites/${site.slug}/blog-posts/<slug>`;

  const curlForm = `curl -X POST '${formsUrl}' \\
  -H "Content-Type: application/json" \\
  -d '{
    "form_name": "contact",
    "payload": { "name": "Ada Lovelace", "email": "ada@example.com", "message": "Hello!" },
    "turnstileToken": ""
  }'`;

  const stripeWebhookUrl = `${studioUrl}/api/v1/webhooks/stripe`;
  const stripeStudioEnv = `# Add these to the Studio (CMS) Vercel project — not the public site.
WEBINAR_STRIPE_PAYMENT_LINK=https://buy.stripe.com/4gMdR9fu1a1XfrN6vB3Je09
STRIPE_WEBHOOK_SECRET=whsec_...   # from Stripe → Developers → Webhooks → Signing secret
`;
  const metaCapiEnv = `# Studio (CMS) Vercel — Purchase CAPI only (Lead = browser Pixel after CMS 2xx).
META_PIXEL_ID=1000856715673214
META_CAPI_ACCESS_TOKEN=...   # Events Manager → Pixel → Settings → Generate access token
# META_TEST_EVENT_CODE=TESTxxxx   # Test Events tab only; remove after QA
`;

  return (
    <div className="max-w-4xl space-y-10">
      <PageHeader
        eyebrow="Integration"
        title="Connect this workspace"
        description="Everything a developer (or AI coding agent) needs to wire a site into this workspace. Copy the block that matches your framework into your site's .env file, then read the integration guide for fetching content and posting form submissions."
      />

      {/* Key gate notice */}
      {activeKeyCount === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--tone-warn-border)] bg-[var(--tone-warn-bg)] px-4 py-3 text-[13px] text-[var(--tone-warn-fg)]">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            You have no active API keys for <b>{site.name}</b>. The public API
            is currently open read-only — handy for bootstrapping, but you
            should{" "}
            <Link
              className="underline underline-offset-2"
              href={`/${site.slug}/api-keys`}
            >
              create a key
            </Link>{" "}
            before going to production.
          </div>
        </div>
      )}

      {/* ── Env vars ── */}
      <Section
        title="Environment variables"
        trailing={
          <Link
            className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
            href={`/${site.slug}/api-keys`}
          >
            Manage keys <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="space-y-5">
          <CopyBlock label="vite — kingsbridge, searchhub, clona" value={viteEnv} />
          <CopyBlock label="astro — vantage" value={astroEnv} />
          <CopyBlock label="next.js — future projects" value={nextEnv} />
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
          Replace{" "}
          <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-[11px]">
            &lt;paste-the-secret-from-API-Keys&gt;
          </code>{" "}
          with the full secret shown once when you create a key. The prefix in
          the keys table (e.g. <code className="font-mono">{samplePrefix}</code>
          ) is the public identifier — the full secret is shown once and
          should be stored as a CI/host environment variable.
        </p>
      </Section>

      {/* ── Unified endpoint note ── */}
      <Section title="One endpoint, one domain">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
          <p>
            Both content reads <i>and</i> form submissions happen on the CMS
            URL. Your public site only ever talks to{" "}
            <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-[11px]">
              {studioUrl.replace(/^https?:\/\//, "")}
            </code>{" "}
            — Supabase is never exposed to the browser, no anon keys, no
            gateway gymnastics. Whitelabel the CMS subdomain to{" "}
            <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-[11px]">cms.acme.com</code>{" "}
            and clients see only their own brand.
          </p>
          <div className="mt-3 grid gap-1.5 font-mono text-[11.5px]">
            <div className="text-[var(--color-fg)]">
              <span className="text-[var(--color-fg-subtle)]">GET&nbsp;&nbsp;</span>
              {studioUrl}/api/v1/sites/{site.slug}/blog-posts
            </div>
            <div className="text-[var(--color-fg)]">
              <span className="text-[var(--color-fg-subtle)]">POST </span>
              {formsUrl}
            </div>
          </div>
        </div>
      </Section>

      {/* ── API smoke tests ── */}
      <Section title="Smoke tests">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[12.5px] text-[var(--color-fg-muted)]">
              List the most recent blog posts:
            </div>
            <CopyBlock language="bash" label="GET /blog_posts" value={curlList} />
          </div>
          <div>
            <div className="mb-2 text-[12.5px] text-[var(--color-fg-muted)]">
              Fetch a single post by slug:
            </div>
            <CopyBlock language="bash" label="GET /blog_posts/:slug" value={curlSingle} />
          </div>
          <div>
            <div className="mb-2 text-[12.5px] text-[var(--color-fg-muted)]">
              Submit a contact-form payload (Turnstile token required if enabled):
            </div>
            <CopyBlock language="bash" label="POST /submit-form" value={curlForm} />
          </div>
        </div>
      </Section>

      {site.slug === "kingsbridge" && (
        <Section title="Webinar $1 · Stripe">
          <div className="space-y-4 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
            <p>
              Reserve on the public site creates an <b className="text-[var(--color-fg)]">unpaid</b>{" "}
              row, then redirects to the Payment Link. Stripe calls this webhook to mark the seat{" "}
              <b className="text-[var(--color-fg)]">paid</b>. View registrants under{" "}
              <Link
                href={`/${site.slug}/webinar`}
                className="text-[var(--color-fg)] underline underline-offset-2"
              >
                Webinar
              </Link>
              .
            </p>
            <CopyBlock label="Stripe webhook endpoint URL" value={stripeWebhookUrl} />
            <CopyBlock label="Studio Vercel env (CMS project only)" value={stripeStudioEnv} />
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Stripe Dashboard → Developers → Webhooks → Add endpoint → paste the URL above.
              </li>
              <li>
                Events: <code className="font-mono text-[11px]">checkout.session.completed</code>,{" "}
                <code className="font-mono text-[11px]">charge.refunded</code>.
              </li>
              <li>
                Copy the signing secret into{" "}
                <code className="font-mono text-[11px]">STRIPE_WEBHOOK_SECRET</code> on Vercel, then
                redeploy Studio.
              </li>
              <li>
                First-time DB setup: run{" "}
                <code className="font-mono text-[11px]">supabase/migrations/0009_webinar_registrations.sql</code>{" "}
                in the Supabase SQL editor (service-role keys cannot create tables).
              </li>
            </ul>
          </div>
        </Section>
      )}

      {site.slug === "kingsbridge" && (
        <Section title="Meta CAPI · Lead + Purchase">
          <div className="space-y-4 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
            <p>
              Existing Pixel <code className="font-mono text-[11px]">1000856715673214</code> stays on
              the public site (do not reinstall).{" "}
              <b className="text-[var(--color-fg)]">Lead</b> fires from the browser Pixel only after
              CMS returns success. <b className="text-[var(--color-fg)]">Purchase</b> is CAPI from the
              Stripe webhook when the seat becomes paid.
            </p>
            <CopyBlock label="Studio Vercel env (CAPI)" value={metaCapiEnv} />
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Events Manager → Data sources → Pixel → Settings → Generate access token → paste into{" "}
                <code className="font-mono text-[11px]">META_CAPI_ACCESS_TOKEN</code>.
              </li>
              <li>
                QA: set <code className="font-mono text-[11px]">META_TEST_EVENT_CODE</code> from the
                Test Events tab, run{" "}
                <code className="font-mono text-[11px]">npx tsx scripts/test-meta-capi.ts</code>, then
                remove the test code and redeploy.
              </li>
            </ul>
          </div>
        </Section>
      )}

      {/* ── Deploy hooks ── */}
      <Section
        title="Deploy hooks"
        trailing={
          <Link
            className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
            href={`/${site.slug}/settings`}
          >
            Settings <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-start gap-3">
            <Webhook className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-fg-muted)]" />
            <div className="space-y-3 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
              <p>
                When published content changes, Studio queues a build job. A
                cron runs every minute, coalesces queued jobs, and POSTs to the
                deploy hook URL you set in{" "}
                <Link
                  href={`/${site.slug}/settings`}
                  className="text-[var(--color-fg)] underline underline-offset-2"
                >
                  Settings
                </Link>
                . Any platform with a plain POST-able deploy URL works:
              </p>
              <ul className="space-y-1.5">
                <li>
                  <b className="text-[var(--color-fg)]">Vercel</b> — Project →
                  Settings → Git → <span className="font-mono">Deploy Hooks</span>.
                </li>
                <li>
                  <b className="text-[var(--color-fg)]">AWS Amplify</b> — App
                  settings → Build settings →{" "}
                  <span className="font-mono">Incoming webhooks</span>.
                </li>
                <li>
                  <b className="text-[var(--color-fg)]">Netlify</b> — Site
                  settings → Build &amp; deploy →{" "}
                  <span className="font-mono">Build hooks</span>.
                </li>
                <li>
                  <b className="text-[var(--color-fg)]">Cloudflare Pages</b> —
                  Project → Settings → Builds &amp; deployments →{" "}
                  <span className="font-mono">Deploy hooks</span>.
                </li>
                <li>
                  <b className="text-[var(--color-fg)]">Render</b> — Service →
                  Settings → <span className="font-mono">Deploy hook</span>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Read the docs ── */}
      <Section title="Next steps">
        <div className="grid gap-3 sm:grid-cols-3">
          <DocLink
            href="https://github.com/your-org/clona-searchhub/blob/main/studio/docs/INTEGRATION.md"
            title="Manual integration"
            desc="Step-by-step for a human dev: install the SDK, build-time fetch, fallbacks."
          />
          <DocLink
            href="https://github.com/your-org/clona-searchhub/blob/main/studio/docs/AGENT_INTEGRATION_PROMPT.md"
            title="AI agent prompt"
            desc="Paste this into Cursor / Claude Code / GPT-5 to integrate a new site end-to-end."
          />
          <DocLink
            href="https://github.com/your-org/clona-searchhub/blob/main/studio/docs/ARCHITECTURE.md"
            title="Architecture"
            desc="How Studio, Supabase and the public site fit together. Live vs rebuilt content."
          />
        </div>
      </Section>

      <div className="flex items-center gap-2 pt-2 text-[11px] text-[var(--color-fg-subtle)]">
        <Plug className="h-3 w-3" /> Workspace: {site.slug} · Studio: {studioUrl.replace(/^https?:\/\//, "")}
      </div>
    </div>
  );
}

function DocLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]/50"
    >
      <div className="flex items-center justify-between">
        <div
          className="text-[14px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          {title}
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-fg-subtle)] transition group-hover:text-[var(--color-fg)]" />
      </div>
      <div className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
        {desc}
      </div>
    </a>
  );
}
