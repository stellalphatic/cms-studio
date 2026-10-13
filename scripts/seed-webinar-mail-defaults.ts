import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const r = await client.query(`
    update public.sites set
      webinar_date_label = coalesce(webinar_date_label, 'October 21, 2026'),
      webinar_local_time_label = coalesce(webinar_local_time_label, '12:30 PM America/Toronto'),
      webinar_timezone = coalesce(webinar_timezone, 'America/Toronto'),
      webinar_zoom_url = coalesce(
        webinar_zoom_url,
        'https://us06web.zoom.us/j/81115328974?pwd=iws54ne0SHl0uRBSky9siDsQe60L29.1'
      ),
      webinar_zoom_meeting_id = coalesce(webinar_zoom_meeting_id, '811 1532 8974'),
      webinar_zoom_passcode = coalesce(webinar_zoom_passcode, '532418'),
      webinar_unpaid_reminder_minutes = coalesce(webinar_unpaid_reminder_minutes, 15),
      brevo_from_name = coalesce(brevo_from_name, 'Kingsbridge Immigration')
    where slug = 'kingsbridge'
    returning slug, webinar_date_label, webinar_unpaid_reminder_minutes
  `);
  console.log(r.rows);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
