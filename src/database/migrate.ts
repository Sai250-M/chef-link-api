import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { Client } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Maps each migration filename to a sentinel query that returns 1 row if the
// migration was already applied (used to bootstrap the tracking table).
const SENTINELS: Record<string, string> = {
  "001_initial_schema.sql":
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'",
  "002_event_booking_schema.sql":
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public'",
  "003_guest_booking_requests.sql":
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_requests' AND table_schema = 'public'",
};

async function getClient(): Promise<Client> {
  if (process.env.DATABASE_URL) {
    return new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL !== "false" ? { rejectUnauthorized: false } : false,
    });
  }

  return new Client({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

async function migrate() {
  const client = await getClient();
  await client.connect();

  try {
    const { rowCount: trackingTableExists } = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'schema_migrations' AND table_schema = 'public'
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(255) NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    const { rowCount: trackedCount } = await client.query(
      "SELECT 1 FROM schema_migrations LIMIT 1"
    );

    // Bootstrap: if the tracking table is empty (first time using this script),
    // detect already-applied migrations via sentinel queries so we don't re-run them.
    if (!trackingTableExists || trackedCount === 0) {
      for (const [filename, sentinel] of Object.entries(SENTINELS)) {
        const { rowCount } = await client.query(sentinel);
        if (rowCount && rowCount > 0) {
          await client
            .query(
              "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
              [filename]
            )
            .catch(() => {});
          console.log(`📌 Detected already-applied: ${filename}`);
        }
      }
    }

    const migrationsDir = path.resolve(__dirname, "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const { rows: applied } = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations ORDER BY filename"
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    const pending = files.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log("✅ All migrations already applied.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`⏳ Applying ${file}…`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✅ Applied  ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log(`\n🎉 Done — ${pending.length} migration(s) applied.`);
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
