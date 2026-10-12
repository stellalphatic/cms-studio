/**
 * Apply 0009_webinar_registrations.sql against the Studio Postgres database.
 *
 * Usage (from studio/):
 *   DATABASE_URL="postgresql://..." npx tsx scripts/apply-webinar-migration.ts
 *
 * Or set DATABASE_URL / DIRECT_URL in studio/.env first.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Missing DATABASE_URL or DIRECT_URL. Paste supabase/migrations/0009_webinar_registrations.sql into the Supabase SQL editor instead.",
    );
    process.exit(1);
  }

  // Dynamic import so the script still documents the path when `pg` is absent.
  let Client: new (cfg: { connectionString: string }) => {
    connect: () => Promise<void>;
    query: (sql: string) => Promise<unknown>;
    end: () => Promise<void>;
  };
  try {
    ({ Client } = await import("pg"));
  } catch {
    console.error("Install pg first: npm i -D pg @types/pg");
    process.exit(1);
  }

  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/0009_webinar_registrations.sql"),
    "utf8",
  );

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied 0009_webinar_registrations.sql successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
