/**
 * One-off importer: existing Kingsbridge TS data -> Supabase rows.
 * Idempotent on (site_id, slug) for posts and (site_id, question) for FAQs.
 *
 *   npm run migrate:kingsbridge
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const KB_CONTENT = resolve(__dirname, "../../kingsbridgeImmigration/src/content");

const SITE_ID = "22222222-2222-2222-2222-222222222222";

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
  const abs = resolve(KB_CONTENT, relPath);
  return (await import(pathToFileURL(abs).href)) as T;
}

interface BlogSeed {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  cover: string;
}
interface TestSeed {
  quote: string;
  author: string;
}
interface FaqCat {
  id: string;
  label: string;
  items: { q: string; a: string }[];
}
interface PriceCat {
  title: string;
  rows: { service: string; fee: string; notes: string }[];
}

async function migrateBlog() {
  // The legacy file exports `blogPosts` as readonly tuple — coerce to array.
  const mod = await loadModule<{ blogPosts: readonly BlogSeed[] }>("siteContent.ts");
  const rows = mod.blogPosts.map((p) => ({
    site_id: SITE_ID,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body_html: `<p>${p.excerpt}</p>`,
    cover_url: p.cover,
    cover_alt: p.title,
    category: "Insights",
    tags: [],
    status: "published" as const,
    published_at: new Date(p.date).toISOString(),
    read_minutes: p.readMinutes,
    seo: { title: p.title, description: p.excerpt },
  }));
  const { error } = await sb.from("blog_posts").upsert(rows, { onConflict: "site_id,slug" });
  if (error) throw error;
  console.log(`✓ Upserted ${rows.length} blog posts`);
}

async function migrateTestimonials() {
  const mod = await loadModule<{ testimonials: readonly TestSeed[] }>("siteContent.ts");
  // No unique key — clear & insert.
  await sb.from("testimonials").delete().eq("site_id", SITE_ID);
  const rows = mod.testimonials.map((t, i) => ({
    site_id: SITE_ID,
    author_name: t.author,
    quote: t.quote,
    weight: mod.testimonials.length - i,
    is_published: true,
  }));
  const { error } = await sb.from("testimonials").insert(rows);
  if (error) throw error;
  console.log(`✓ Inserted ${rows.length} testimonials`);
}

async function migrateFaqs() {
  const mod = await loadModule<{ faqCategories: FaqCat[] }>("faqContent.ts");
  await sb.from("faqs").delete().eq("site_id", SITE_ID);
  const rows: Array<{
    site_id: string;
    question: string;
    answer_html: string;
    category: string;
    sort_order: number;
    is_published: boolean;
  }> = [];
  let order = 0;
  for (const cat of mod.faqCategories) {
    for (const item of cat.items) {
      rows.push({
        site_id: SITE_ID,
        question: item.q,
        answer_html: `<p>${item.a}</p>`,
        category: cat.label,
        sort_order: order++,
        is_published: true,
      });
    }
  }
  const { error } = await sb.from("faqs").insert(rows);
  if (error) throw error;
  console.log(`✓ Inserted ${rows.length} FAQs`);
}

async function migratePricing() {
  const mod = await loadModule<{ pricingCategories: PriceCat[] }>("pricingContent.ts");
  await sb.from("pricing_tiers").delete().eq("site_id", SITE_ID);
  const rows: Array<{
    site_id: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    cta_label: string;
    cta_url: string;
    sort_order: number;
    is_published: boolean;
  }> = [];
  let order = 0;
  for (const cat of mod.pricingCategories) {
    for (const row of cat.rows) {
      rows.push({
        site_id: SITE_ID,
        name: row.service,
        price: row.fee,
        period: "",
        description: `${cat.title} — ${row.notes}`,
        features: [],
        cta_label: "Book consultation",
        cta_url: "/book-consultation",
        sort_order: order++,
        is_published: true,
      });
    }
  }
  const { error } = await sb.from("pricing_tiers").insert(rows);
  if (error) throw error;
  console.log(`✓ Inserted ${rows.length} pricing rows`);
}

async function migratePathways() {
  const mod = await loadModule<{
    pathways: readonly { title: string; description: string; to: string; image: string }[];
  }>("siteContent.ts");
  const rows = mod.pathways.map((p, i) => ({
    site_id: SITE_ID,
    slug: p.to.replace(/^\//, ""),
    title: p.title,
    summary: p.description,
    cover_url: p.image,
    status: "published" as const,
    sort_order: i,
  }));
  const { error } = await sb.from("immigration_pathways").upsert(rows, { onConflict: "site_id,slug" });
  if (error) throw error;
  console.log(`✓ Upserted ${rows.length} immigration pathways`);
}

async function main() {
  console.log("→ Migrating Kingsbridge data to Supabase…");
  await migrateBlog();
  await migrateTestimonials();
  await migrateFaqs();
  await migratePricing();
  await migratePathways();
  console.log("✓ Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
