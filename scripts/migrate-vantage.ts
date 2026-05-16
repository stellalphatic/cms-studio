/**
 * One-off importer: existing Vantage TS data -> Supabase rows.
 *
 *   npm run migrate:vantage
 *
 * - field notes become blog_posts (the public site treats them as insights)
 * - testimonials become testimonials
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VANTAGE_DATA = resolve(__dirname, "../../vantage/src/data");

const SITE_ID = "33333333-3333-3333-3333-333333333333";

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

async function loadModule<T>(file: string): Promise<T> {
  const abs = resolve(VANTAGE_DATA, file);
  return (await import(pathToFileURL(abs).href)) as T;
}

interface FieldNote {
  category: string;
  date: string;
  title: string;
  excerpt: string;
  href: string;
}

interface Testimonial {
  quote: string;
  attribution: string;
  year: number;
  result?: string;
}

async function migrateFieldNotes() {
  const mod = await loadModule<{ fieldNotes: FieldNote[] }>("fieldnotes.legacy.ts");
  const rows = mod.fieldNotes.map((n) => ({
    site_id: SITE_ID,
    slug: slugify(n.title),
    title: n.title,
    excerpt: n.excerpt,
    body_html: `<p>${n.excerpt}</p>`,
    category: n.category,
    tags: [],
    status: "published" as const,
    published_at: new Date(n.date).toISOString(),
  }));
  const { error } = await sb.from("blog_posts").upsert(rows, { onConflict: "site_id,slug" });
  if (error) throw error;
  console.log(`✓ Upserted ${rows.length} field-note posts`);
}

async function migrateTestimonials() {
  const mod = await loadModule<{ testimonials: Testimonial[] }>("testimonials.legacy.ts");
  await sb.from("testimonials").delete().eq("site_id", SITE_ID);
  const rows = mod.testimonials.map((t, i) => ({
    site_id: SITE_ID,
    author_name: t.attribution,
    author_role: t.attribution,
    quote: t.quote,
    weight: mod.testimonials.length - i,
    is_published: true,
    custom_fields: { year: t.year, result: t.result ?? null },
  }));
  const { error } = await sb.from("testimonials").insert(rows);
  if (error) throw error;
  console.log(`✓ Inserted ${rows.length} testimonials`);
}

async function main() {
  console.log("→ Migrating Vantage data to Supabase…");
  await migrateFieldNotes();
  await migrateTestimonials();
  console.log("✓ Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
