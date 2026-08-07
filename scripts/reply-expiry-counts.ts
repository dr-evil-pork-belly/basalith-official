/**
 * Row counts for email_reply_sessions, before and after the expiry backfill.
 * READ-ONLY. Run it once before pasting 20260806_email_reply_sessions_expiry.sql
 * and once after, and diff the two.
 *
 * Run: npx tsx scripts/reply-expiry-counts.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db  = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const res  = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  const spec = await res.json() as { definitions: Record<string, { properties: Record<string, unknown> }> }
  const hasCol = !!spec.definitions['email_reply_sessions']?.properties?.['expires_at']

  const nowIso = new Date().toISOString()
  console.log(`\nemail_reply_sessions — ${nowIso}`)
  console.log(`expires_at column: ${hasCol ? 'PRESENT' : 'MISSING (migration not applied)'}\n`)

  const count = async (build: (q: ReturnType<typeof db.from>) => unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = build(db.from('email_reply_sessions') as any) as any
    const { count, error } = await q
    if (error) return `ERR ${error.code}`
    return String(count)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const head = (q: any) => q.select('id', { count: 'exact', head: true })

  console.log(`  total                     : ${await count(q => head(q))}`)
  console.log(`  replied                   : ${await count(q => head(q).eq('replied', true))}`)
  console.log(`  unreplied                 : ${await count(q => head(q).eq('replied', false))}`)

  if (!hasCol) {
    console.log(`  unreplied, expired        : n/a (no expires_at column)`)
    console.log(`  unreplied, still live     : n/a (no expires_at column)`)
    console.log(`  null expires_at           : n/a (no expires_at column)`)
    console.log(`\n  EVERY unreplied token above is a permanent bearer credential.\n`)
    return
  }

  console.log(`  unreplied, EXPIRED (dead) : ${await count(q => head(q).eq('replied', false).lte('expires_at', nowIso))}`)
  console.log(`  unreplied, still live     : ${await count(q => head(q).eq('replied', false).gt('expires_at', nowIso))}`)
  console.log(`  null expires_at           : ${await count(q => head(q).is('expires_at', null))}   <- must be 0`)
  console.log(`  live beyond 30 days       : ${await count(q => head(q).eq('replied', false).gt('expires_at', nowIso).lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString()))}   <- must be 0`)
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
