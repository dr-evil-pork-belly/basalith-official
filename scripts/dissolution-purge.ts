/**
 * Deletes one archive's objects from Supabase Storage across the five
 * archive-scoped buckets. Dissolution only. See docs/DISSOLUTION_RUNBOOK.md 4.1.
 *
 *   npx tsx scripts/dissolution-purge.ts <archive-id>             lists, deletes nothing
 *   npx tsx scripts/dissolution-purge.ts <archive-id> --confirm   deletes
 *
 * Since September 17, 2026 the body lives in lib/storagePurge.ts, shared with
 * the trial expiry job (lib/trialExpiryRunner.ts), so the runbook and the
 * job run one implementation. Every safety property is in the lib and
 * documented there: the termination_requested_at gate, the {archiveId}/
 * prefix, the five buckets, the Storage API over SQL, the post-delete walk.
 * This file parses the arguments and prints what the lib returns.
 *
 * PROVEN August 12, 2026 against the disposable drill archive
 * dddddddd-0000-4000-8000-000000009a01, six objects across three buckets.
 */
import './load-env'
import { createClient } from '@supabase/supabase-js'
import { purgeArchiveStorage } from '../lib/storagePurge'

const archiveId = process.argv[2]
const confirmed = process.argv.includes('--confirm')

if (!archiveId || !/^[0-9a-f-]{36}$/i.test(archiveId)) {
  console.error('usage: npx tsx scripts/dissolution-purge.ts <archive-uuid> [--confirm]')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  const result = await purgeArchiveStorage(archiveId, { supabaseAdmin: supabase, dryRun: !confirmed })
  if (result.dryRun) console.log('Dry run. Re-run with --confirm to delete.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
