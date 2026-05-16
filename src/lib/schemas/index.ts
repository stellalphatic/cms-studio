import { searchhubSchema } from "./searchhub";
import { kingsbridgeSchema } from "./kingsbridge";
import { vantageSchema } from "./vantage";
import { clonaSchema } from "./clona";

export type ContentTypeKey =
  | "blog_posts"
  | "case_studies"
  | "testimonials"
  | "faqs"
  | "pages"
  | "immigration_pathways"
  | "pricing_tiers"
  | "bulk_tiers"
  | "services";

export interface ContentTypeConfig {
  key: ContentTypeKey;
  label: string;
  pluralLabel: string;
  icon: string;
  /** Custom fields exposed in the editor in addition to the base schema. */
  customFields?: Array<CustomFieldDef>;
}

export interface CustomFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "url" | "image";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  help?: string;
}

export interface SiteSchema {
  slug: string;
  contentTypes: ContentTypeConfig[];
}

export const siteSchemas: Record<string, SiteSchema> = {
  searchhub: searchhubSchema,
  kingsbridge: kingsbridgeSchema,
  vantage: vantageSchema,
  clona: clonaSchema,
};

export function getSiteSchema(slug: string): SiteSchema | undefined {
  return siteSchemas[slug];
}
