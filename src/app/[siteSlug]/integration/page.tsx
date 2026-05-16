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

  // Derive the Supabase Functions base from the Supabase URL.
  // https://abc.supabase.co  -> https://abc.functions.supabase.co/submit-form
  const supaUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  let formsUrl = `${supaUrl.replace(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/, "https://$1.functions.supabase.co")}/submit-form`;
  if (!supaUrl) formsUrl = "https://YOUR-PROJECT.functions.supabase.co/submit-form";

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const activeKeyCount = keys?.length ?? 0;
  const samplePrefix = keys?.[0]?.prefix ?? "sk_xxxx";

  // Vite (Kingsbridge, SearchHub, Clona)
  const viteEnv = `# ─── Studio CMS ───────────────────────────────────────────────
VITE_CMS_URL=${studioUrl}
VITE_CMS_SITE=${site.slug}
VITE_CMS_API_KEY=<paste-the-secret-from-API-Keys>

# ─── Forms (Supabase Edge Function) ──────────────────────────
VITE_FORMS_URL=${formsUrl}
VITE_FORMS_SITE=${site.slug}
${turnstileSiteKey ? `VITE_TURNSTILE_SITE_KEY=${turnstileSiteKey}` : "VITE_TURNSTILE_SITE_KEY=<from Cloudflare Turnstile>"}
`;

  // Astro (Vantage)
  const astroEnv = `# ─── Studio CMS ───────────────────────────────────────────────
CMS_URL=${studioUrl}
CMS_SITE=${site.slug}
CMS_API_KEY=<paste-the-secret-from-API-Keys>

# ─── Forms (Supabase Edge Function) ──────────────────────────
PUBLIC_FORMS_URL=${formsUrl}
PUBLIC_FORMS_SITE=${site.slug}
${turnstileSiteKey ? `PUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}` : "PUBLIC_TURNSTILE_SITE_KEY=<from Cloudflare Turnstile>"}
`;

  // Next.js (future sites)
  const nextEnv = `# ─── Studio CMS ───────────────────────────────────────────────
NEXT_PUBLIC_CMS_URL=${studioUrl}
NEXT_PUBLIC_CMS_SITE=${site.slug}
CMS_API_KEY=<paste-the-secret-from-API-Keys>

# ─── Forms (Supabase Edge Function) ──────────────────────────
NEXT_PUBLIC_FORMS_URL=${formsUrl}
NEXT_PUBLIC_FORMS_SITE=${site.slug}
${turnstileSiteKey ? `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}` : "NEXT_PUBLIC_TURNSTILE_SITE_KEY=<from Cloudflare Turnstile>"}
`;

  const curlList = `curl -H "Authorization: Bearer ${samplePrefix}…" \\
  ${studioUrl}/api/v1/sites/${site.slug}/blog_posts`;

  const curlSingle = `curl -H "Authorization: Bearer ${samplePrefix}…" \\
  ${studioUrl}/api/v1/sites/${site.slug}/blog_posts/<slug>`;

  const curlForm = `curl -X POST ${formsUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "site": "${site.slug}",
    "form": "contact",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "message": "Hello!",
    "turnstileToken": "<from widget>"
  }'`;

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
