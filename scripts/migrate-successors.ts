/**
 * Run: DB_PASSWORD=<your-supabase-db-password> npx tsx scripts/migrate-successors.ts
 *
 * DB password: Supabase dashboard → Project Settings → Database → Database password
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const projectRef  = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
const dbPassword  = process.env.DB_PASSWORD

if (!dbPassword) {
  console.error('\nERROR: DB_PASSWORD not set.')
  console.error('Run: DB_PASSWORD=<password> npx tsx scripts/migrate-successors.ts')
  console.error('\nFind your password: Supabase dashboard → Project Settings → Database → Database password\n')
  process.exit(1)
}

const client = new Client({
  host:     `db.${projectRef}.supabase.co`,
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: dbPassword,
  ssl:      { rejectUnauthorized: false },
})

const SQL = `
CREATE TABLE IF NOT EXISTS successors (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id   UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  organization TEXT,
  title        TEXT,
  password_hash TEXT       NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS successor_contexts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id   UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  successor_id UUID        NOT NULL REFERENCES successors(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  context_type TEXT        NOT NULL DEFAULT 'business_update',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_successors_archive_id         ON successors(archive_id);
CREATE INDEX IF NOT EXISTS idx_successor_contexts_archive_id ON successor_contexts(archive_id);

ALTER TABLE successors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE successor_contexts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'successors' AND policyname = 'service_role_all_successors'
  ) THEN
    CREATE POLICY "service_role_all_successors" ON successors
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'successor_contexts' AND policyname = 'service_role_all_successor_contexts'
  ) THEN
    CREATE POLICY "service_role_all_successor_contexts" ON successor_contexts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('successors', 'successor_contexts')
ORDER BY table_name;
`

async function main() {
  console.log(`\nConnecting to db.${projectRef}.supabase.co …`)
  await client.connect()
  console.log('Connected.\n')

  const results = await client.query(SQL)

  // The last query in the batch returns the table verification
  const last = Array.isArray(results) ? results[results.length - 1] : results
  const tables: string[] = (last?.rows ?? []).map((r: { table_name: string }) => r.table_name)

  console.log('Tables verified:', tables)

  if (tables.includes('successors') && tables.includes('successor_contexts')) {
    console.log('\n✓ Migration complete. Both tables exist and are RLS-enabled.\n')
  } else {
    console.error('\n✗ Verification failed — one or both tables missing:', tables)
    process.exit(1)
  }

  await client.end()
}

main().catch(async err => {
  console.error('Migration error:', err.message)
  await client.end().catch(() => {})
  process.exit(1)
})
