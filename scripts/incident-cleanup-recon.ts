/** READ-ONLY recon for the cleanup task. No writes. Confirms the test incident's
 *  full row set on the Founder Test Archive, anchored by the STAKE deposit. */
import './load-env'
import { supabaseAdmin } from '../lib/supabase-admin'

const ARCHIVE = '6c0722d3-719a-423f-9024-621ba0072d6f'
const ANCHOR_DEPOSIT = '188375ed-d40a-485b-b456-96ba9ff083d1' // the STAKE deposit

async function main() {
  // Find the COMPLETE incident whose probeHistory contains the anchor deposit.
  const { data: incidents } = await supabaseAdmin
    .from('incident_sessions')
    .select('id, phase, status, created_at, state')
    .eq('archive_id', ARCHIVE)
    .eq('status', 'complete')

  const inc = (incidents ?? []).find(r =>
    Array.isArray(r.state?.probeHistory) &&
    r.state.probeHistory.some((ph: { depositId?: string }) => ph?.depositId === ANCHOR_DEPOSIT),
  )
  if (!inc) { console.log('anchor incident NOT found'); return }

  const depositIds: string[] = [
    ...new Set(
      (inc.state.probeHistory as { depositId?: string }[])
        .map(ph => ph?.depositId)
        .filter((x): x is string => !!x),
    ),
  ]
  console.log('incidentId:', inc.id, 'phase:', inc.phase, 'status:', inc.status, 'created_at:', inc.created_at)
  console.log('dimensions:', JSON.stringify(inc.state.dimensions), 'probeBudgetUsed:', inc.state.probeBudgetUsed)
  console.log('depositIds in probeHistory:', depositIds.length)

  const { data: deposits } = await supabaseAdmin
    .from('owner_deposits')
    .select('id, source_type, eval_holdout, created_at')
    .eq('archive_id', ARCHIVE)
    .in('id', depositIds)
  console.log('owner_deposits found:', deposits?.length)
  console.log('  eval_holdout already true:', (deposits ?? []).filter(d => d.eval_holdout === true).length)

  const { data: pairs } = await supabaseAdmin
    .from('training_pairs')
    .select('id, source_id, source_type, included_in_training, metadata')
    .eq('archive_id', ARCHIVE)
    .in('source_id', depositIds)
  console.log('training_pairs found:', pairs?.length)
  console.log('  included_in_training=true:', (pairs ?? []).filter(p => p.included_in_training === true).length)
  console.log('  already test_artifact:', (pairs ?? []).filter(p => p.metadata?.test_artifact === true).length)
  console.log('  dimension-tagged:', (pairs ?? []).filter(p => p.metadata?.dimension).length)

  // Sanity: any deposit id with no pair, or any pair whose source_id is outside the set?
  const pairSrc = new Set((pairs ?? []).map(p => p.source_id))
  console.log('  deposit ids with no training pair:', depositIds.filter(d => !pairSrc.has(d)))
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
