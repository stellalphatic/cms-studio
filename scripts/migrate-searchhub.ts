/**
 * One-off importer: existing SearchHub TS data -> Supabase rows.
 * Idempotent on (site_id, slug) for posts/case studies.
 *
 *   npm run migrate:searchhub
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEARCHHUB_DATA = resolve(__dirname, "../../SearchHub_digital-/src/data");

const SITE_ID = "11111111-1111-1111-1111-111111111111";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}
const sb = createClient(url, key);

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadModule<T>(relPath: string): Promise<T> {
  const abs = resolve(SEARCHHUB_DATA, relPath);
  const url = pathToFileURL(abs).href;
  return (await import(url)) as T;
}

interface SourceBlogPost {
  id: number;
  title: string;
  date: string;
  author: string;
  authorAvatar: string;
  category: string;
  keywords: string[];
  snippet: string;
  image: string;
  researchDocUrl?: string;
  content: string;
}

interface SourceCaseStudy {
  id: number;
  client: string;
  industry: string;
  category: string;
  title: string;
  snippet: string;
  image: string;
  metrics: Array<{ label: string; value: string }>;
  chart: Array<{ stage: string; score: number }>;
  challenge: string;
  solution: string;
  outcomes: string[];
  stack: string[];
}

async function migrateAuthors(posts: SourceBlogPost[]) {
  const unique = new Map<string, { name: string; avatar: string }>();
  for (const p of posts) {
    if (!unique.has(p.author)) unique.set(p.author, { name: p.author, avatar: p.authorAvatar });
  }
  const rows = Array.from(unique.values()).map((a) => ({
    site_id: SITE_ID,
    name: a.name,
    slug: slugify(a.name),
    avatar_url: a.avatar,
  }));
  const { error } = await sb.from("authors").upsert(rows, { onConflict: "site_id,slug" });
  if (error) throw error;
  console.log(`✓ Upserted ${rows.length} authors`);

  const { data: dbAuthors } = await sb
    .from("authors")
    .select("id, slug")
    .eq("site_id", SITE_ID);
  const map = new Map<string, string>();
  for (const a of dbAuthors ?? []) map.set(a.slug, a.id);
  return map;
}

async function migrateBlogPosts(posts: SourceBlogPost[], authorMap: Map<string, string>) {
  const rows = posts.map((p) => ({
    site_id: SITE_ID,
    slug: slugify(p.title),
    title: p.title,
    excerpt: p.snippet,
    body_html: p.content,
    cover_url: p.image,
    cover_alt: p.title,
    author_id: authorMap.get(slugify(p.author)) ?? null,
    category: p.category,
    tags: p.keywords ?? [],
    status: "published" as const,
    published_at: new Date(p.date).toISOString(),
    seo: { title: p.title, description: p.snippet },
    custom_fields: p.researchDocUrl ? { research_doc_url: p.researchDocUrl } : {},
  }));
  const { error } = await sb.from("blog_posts").upsert(rows, { onConflict: "site_id,slug" });
  if (error) throw error;
  console.log(`✓ Upserted ${rows.length} blog posts`);
}

async function migrateCaseStudies(cases: SourceCaseStudy[]) {
  const rows = cases.map((c) => ({
    site_id: SITE_ID,
    slug: slugify(c.title),
    title: c.title,
    client: c.client,
    industry: c.industry,
    category: c.category,
    snippet: c.snippet,
    image_url: c.image,
    metrics: c.metrics,
    chart: c.chart,
    challenge: c.challenge,
    solution: c.solution,
    outcomes: c.outcomes,
    stack: c.stack,
    status: "published" as const,
    published_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("case_studies").upsert(rows, { onConflict: "site_id,slug" });
  if (error) throw error;
  console.log(`✓ Upserted ${rows.length} case studies`);
}

async function migrateBulkTiers() {
  const mod = await loadModule<{ BULK_TIERS: Array<{
    tier: number;
    name: string;
    price: string;
    period: string;
    tagline: string;
    features: string[];
    saving: string;
    buttonText: string;
    popular: boolean;
  }> }>("bulkTiers.ts");

  const rows = mod.BULK_TIERS.map((t) => ({
    site_id: SITE_ID,
    tier_name: t.name,
    link_count: null,
    price_per_link: null,
    total_price: t.price,
    description: `${t.tagline} ${t.saving}`,
    features: t.features,
    highlight: t.popular,
    sort_order: t.tier,
    is_published: true,
  }));
  // No unique key on bulk_tiers — clear & insert for idempotency
  await sb.from("bulk_tiers").delete().eq("site_id", SITE_ID);
  const { error } = await sb.from("bulk_tiers").insert(rows);
  if (error) throw error;
  console.log(`✓ Inserted ${rows.length} bulk tiers`);
}

async function main() {
  console.log("→ Migrating SearchHub data to Supabase…");

  const blogMod = await loadModule<{ blogPosts: SourceBlogPost[] }>("blogPosts.ts");
  const authorMap = await migrateAuthors(blogMod.blogPosts);
  await migrateBlogPosts(blogMod.blogPosts, authorMap);

  const casesMod = await loadModule<{ caseStudies: SourceCaseStudy[] }>("caseStudies.ts");
  await migrateCaseStudies(casesMod.caseStudies);

  await migrateBulkTiers();

  console.log("✓ Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
