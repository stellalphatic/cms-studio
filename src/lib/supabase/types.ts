/**
 * Hand-rolled row types that mirror the SQL schema in
 * studio/supabase/migrations/. These are the source of truth until
 * `supabase gen types typescript` is wired into CI; once it is, this file
 * just re-exports from `database.types.ts`.
 */

export type SiteRole = "owner" | "admin" | "editor" | "viewer";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type SubmissionStatus =
  | "new"
  | "in_progress"
  | "contacted"
  | "closed"
  | "spam";

export interface Site {
  id: string;
  slug: string;
  name: string;
  primary_domain: string | null;
  brand: {
    logo?: string;
    primary?: string;
    accent?: string;
    tagline?: string;
  };
  amplify_webhook_url: string | null;
  build_debounce_seconds: number;
  enabled_content_types: string[];
  resend_api_key: string | null;
  resend_from_email: string | null;
  notify_emails: string[];
  cms_domain: string | null;
  allowed_origins: string[];
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  site_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteMember {
  user_id: string;
  site_id: string;
  role: SiteRole;
  created_at: string;
}

export interface SiteMembership extends SiteMember {
  site: Site;
}

export interface Author {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string;
  cover_url: string | null;
  cover_alt: string | null;
  author_id: string | null;
  category: string | null;
  tags: string[];
  read_minutes: number | null;
  status: ContentStatus;
  published_at: string | null;
  scheduled_for: string | null;
  seo: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CaseStudy {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  client: string | null;
  industry: string | null;
  category: string | null;
  snippet: string | null;
  image_url: string | null;
  metrics: Array<{ label: string; value: string }>;
  chart: Array<{ stage: string; score: number }>;
  challenge: string | null;
  solution: string | null;
  outcomes: string[];
  stack: string[];
  status: ContentStatus;
  published_at: string | null;
  seo: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  site_id: string;
  author_name: string;
  author_role: string | null;
  quote: string;
  avatar_url: string | null;
  weight: number;
  is_published: boolean;
  custom_fields: Record<string, unknown>;
}

export interface Faq {
  id: string;
  site_id: string;
  question: string;
  answer_html: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  custom_fields: Record<string, unknown>;
}

export interface FormSubmission {
  id: string;
  site_id: string;
  form_name: string;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  assigned_to: string | null;
  notes: string | null;
  source_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImmigrationPathway {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  category: string | null;
  summary: string | null;
  body_html: string | null;
  eligibility: string[];
  process_steps: Array<{ title: string; body: string }>;
  fees: Record<string, unknown>;
  processing_time: string | null;
  cover_url: string | null;
  status: ContentStatus;
  sort_order: number;
  custom_fields: Record<string, unknown>;
}
