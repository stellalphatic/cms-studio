import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  FileText,
  Globe2,
  Image,
  Inbox,
  KeyRound,
  Layers3,
  PenLine,
  Rocket,
  Shield,
  Users,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";

export type FeatureDetail = {
  icon: LucideIcon;
  title: string;
  summary: string;
  bullets: string[];
  category: string;
  featured?: boolean;
};

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
  features: string[];
};

export const TRUST_BRANDS = ["Kingsbridge", "SearchHub", "Vantage"] as const;

export const STATS = [
  { value: "1", label: "control plane", detail: "for every site you operate" },
  { value: "<90s", label: "to production", detail: "from publish to live static build" },
  { value: "∞", label: "workspaces", detail: "multi-tenant by design" },
] as const;

export const PILLARS = [
  {
    icon: Layers3,
    title: "Multi-tenant by default",
    body: "Every row is scoped by site_id. Onboard Kingsbridge, SearchHub, Vantage — or the next client — without new infrastructure.",
  },
  {
    icon: Blocks,
    title: "Static-first delivery",
    body: "Client sites prefetch published content into typed modules. SEO preserved, performance uncompromised, ops simplified.",
  },
  {
    icon: Zap,
    title: "Automatic deploys",
    body: "Publish triggers debounced webhooks. Your Amplify apps rebuild within seconds — no manual copy-paste.",
  },
] as const;

export const CAPABILITIES = [
  {
    icon: PenLine,
    title: "Editorial canvas",
    body: "A serif-first writing surface with live preview, scheduling, and media — built for long-form craft, not form builders.",
    details: ["TipTap rich editor", "Scheduled publishing", "Draft preview links", "Media library"],
  },
  {
    icon: Inbox,
    title: "Operations inbox",
    body: "Triage contact submissions per site with filters, exports, and per-workspace email routing through Resend.",
    details: ["Per-site form inbox", "CSV export", "Resend routing", "Turnstile spam guard"],
  },
  {
    icon: Workflow,
    title: "Publish pipeline",
    body: "Postgres triggers queue build jobs. Edge functions debounce and fire Amplify webhooks automatically.",
    details: ["Build job queue", "Debounced webhooks", "Cron dispatch", "Publish audit trail"],
  },
  {
    icon: KeyRound,
    title: "Headless API",
    body: "Bearer-authenticated REST endpoints feed static SSG builds at compile time — zero runtime database hits.",
    details: ["REST API v1", "Per-site API keys", "Typed prefetch", "CORS allow-list"],
  },
  {
    icon: Shield,
    title: "Role-based access",
    body: "Owner, admin, editor, viewer — scoped per workspace with platform super-admin for your agency.",
    details: ["4 role levels", "Platform admin", "Per-site invites", "Audit logging"],
  },
  {
    icon: Globe2,
    title: "White-label ready",
    body: "Custom CMS subdomains, per-site branding, and isolated settings without spinning up new infrastructure.",
    details: ["Custom cms_domain", "Brand colors & logo", "Isolated settings", "Client-facing login"],
  },
] as const;

export const FEATURE_DETAILS: FeatureDetail[] = [
  {
    icon: FileText,
    category: "Content",
    title: "Pages, blog & structured content",
    summary:
      "Manage marketing pages, long-form articles, FAQs, case studies, pricing tiers, and testimonials — all scoped per workspace with publish states and SEO-friendly slugs.",
    bullets: [
      "Marketing pages with custom slugs and meta fields",
      "Blog posts with authors, scheduling, and draft preview",
      "FAQs, case studies, pricing tiers, and testimonials",
      "Bulk-tier content for complex product catalogs",
    ],
  },
  {
    icon: Inbox,
    category: "Operations",
    title: "Forms that feel like an inbox",
    summary:
      "Every contact submission lands in a dedicated workspace inbox. Filter, triage, export, and route notifications without leaving Studio.",
    bullets: [
      "Per-site submission inbox with status filters",
      "Resend email routing with custom notify addresses",
      "Cloudflare Turnstile on every public form",
      "One-click CSV export for client reporting",
    ],
  },
  {
    icon: Rocket,
    category: "Pipeline",
    featured: true,
    title: "Deploy without leaving the canvas",
    summary:
      "Publishing content queues a debounced Amplify webhook. Your static sites rebuild automatically — no manual deploys, no stale content.",
    bullets: [
      "Postgres trigger queues build jobs on publish",
      "Edge function dispatches webhooks within ~90s",
      "Scheduled posts flip to published via cron",
      "Per-site Amplify webhook configuration",
    ],
  },
  {
    icon: Users,
    category: "Access",
    title: "Teams your clients can trust",
    summary:
      "Invite editors, hand off admin keys to clients, and keep platform control as the agency. Every permission is scoped per workspace.",
    bullets: [
      "Owner, admin, editor, and viewer roles",
      "Platform super-admin for your agency ops",
      "Email invitations with role assignment",
      "First signup auto-bootstraps platform admin",
    ],
  },
  {
    icon: Webhook,
    category: "API",
    title: "API-first for static sites",
    summary:
      "Client sites prefetch published content at build time via the public REST API. Zero runtime database hits, full SEO preservation.",
    bullets: [
      "Bearer-authenticated REST API v1",
      "Endpoints for pages, blog, forms, FAQs, and more",
      "Typed generated modules for Vite, Astro, Next",
      "Legacy fallback when env vars aren't set",
    ],
  },
  {
    icon: Image,
    category: "Config",
    featured: true,
    title: "Media, settings & integrations",
    summary:
      "Upload assets, configure per-site email and domains, manage API keys, and wire integrations — all from a single settings surface.",
    bullets: [
      "Centralized media library per workspace",
      "Per-site Resend keys and from-addresses",
      "Custom CMS subdomains (cms.client.com)",
      "API keys with scoped public access",
    ],
  },
];

export const WORKFLOW = [
  {
    step: "01",
    title: "Write & review",
    body: "Draft in a distraction-free editor. Schedule publishes and preview exactly what ships.",
  },
  {
    step: "02",
    title: "Publish once",
    body: "A single action updates Supabase and queues a debounced build for the target site.",
  },
  {
    step: "03",
    title: "Sites rebuild",
    body: "Amplify pulls fresh content via the public API and deploys static HTML to the edge.",
  },
] as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Self-host Studio with your own Supabase project. Perfect for your first workspace.",
    cta: "Get started free",
    ctaHref: "/login",
    features: [
      "Up to 2 workspaces",
      "Unlimited editors per site",
      "Editorial CMS + media library",
      "Form inbox & REST API v1",
      "Community documentation",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "$79",
    period: "per month",
    description: "For agencies running multiple client sites with white-label and deploy automation.",
    highlighted: true,
    cta: "Start 14-day trial",
    ctaHref: "/login",
    features: [
      "Unlimited workspaces",
      "White-label CMS subdomains",
      "Automatic Amplify deploy webhooks",
      "Per-site Resend & Turnstile",
      "Priority email support",
      "Scheduled publishing & preview links",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "Dedicated infrastructure, custom integrations, and hands-on onboarding for larger teams.",
    cta: "Talk to sales",
    ctaHref: "/login?next=/workspaces",
    features: [
      "Everything in Agency",
      "SSO & advanced audit logs",
      "Dedicated Supabase project option",
      "Custom edge functions & integrations",
      "SLA & onboarding workshop",
      "Volume pricing for 20+ workspaces",
    ],
  },
];

export const PRICING_FAQ = [
  {
    q: "Can I self-host on the free plan?",
    a: "Yes. Starter is fully self-hosted — bring your own Supabase project and deploy Studio to Vercel or your infrastructure.",
  },
  {
    q: "What counts as a workspace?",
    a: "One workspace equals one site (e.g. SearchHub, Kingsbridge). Each has isolated content, forms, settings, and team access.",
  },
  {
    q: "Do client sites need Studio licenses?",
    a: "No. Public sites are static builds that read from the API at compile time. Only editors and admins need Studio access.",
  },
] as const;

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const FOOTER_STACK = ["Self-host", "Supabase", "Next.js", "Static-first"] as const;

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#platform" },
      { label: "Capabilities", href: "#capabilities" },
      { label: "Features", href: "#features" },
      { label: "Workflow", href: "#workflow" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        label: "Setup guide",
        href: "https://github.com/stellaphatic/cms-studio/blob/main/docs/SETUP.md",
        external: true,
      },
      {
        label: "Architecture",
        href: "https://github.com/stellaphatic/cms-studio/blob/main/docs/ARCHITECTURE.md",
        external: true,
      },
      {
        label: "Integration",
        href: "https://github.com/stellaphatic/cms-studio/blob/main/docs/INTEGRATION.md",
        external: true,
      },
      {
        label: "Deployment",
        href: "https://github.com/stellaphatic/cms-studio/blob/main/docs/DEPLOYMENT.md",
        external: true,
      },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Start free", href: "/login" },
      { label: "Agency trial", href: "/login" },
      { label: "Talk to sales", href: "/login?next=/workspaces" },
    ],
  },
];
