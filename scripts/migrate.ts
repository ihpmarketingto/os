/**
 * Applies supabase/migrations/*.sql in filename order against DATABASE_URL,
 * tracking applied files in public.schema_migrations so re-runs are no-ops.
 * Each migration runs in its own transaction.
 *
 * Usage: DATABASE_URL=postgresql://... npm run migrate
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { Client } from "pg";

loadDotenv({ path: path.resolve(__dirname, "../apps/web/.env.local") });

const MIGRATIONS_DIR = path.resolve(__dirname, "../supabase/migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Set DATABASE_URL to the Supabase Postgres connection string.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ filename: string }>("select filename from public.schema_migrations");
    const applied = new Set(rows.map((r) => r.filename));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip    ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`apply   ${file} ... `);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
        console.log("ok");
        ran += 1;
      } catch (err) {
        await client.query("rollback");
        console.log("FAILED");
        throw err;
      }
    }

    console.log(`\nDone. ${ran} migration(s) applied, ${files.length - ran} already in place.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
