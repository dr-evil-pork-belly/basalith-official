// scripts/seed-demo-archivist.js
// Run: node scripts/seed-demo-archivist.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const ARCHIVIST_ID = 'd33f4294-b189-4f75-9678-475bef0d391b'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function seed() {
  console.log('Seeding prospects for archivist:', ARCHIVIST_ID, '\n')

  // ── Duplicate guard ────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('prospects')
    .select('id')
    .eq('archivist_id', ARCHIVIST_ID)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('Prospects already exist — skipping.')
    console.log('\nDEMO_ARCHIVIST_ID=' + ARCHIVIST_ID)
    process.exit(0)
  }

  // ── Prospects ──────────────────────────────────────────────────────────────
  // last_contact must be YYYY-MM-DD or null (never an empty string)
  const prospects = [
    { name: 'The Hartwell Family',   contact: 'e.hartwell@email.com',   status: 'Closed',    tier: 'Estate',  last_contact: '2026-03-10', next_action: 'Schedule annual review', closed_at: '2026-03-10T00:00:00Z' },
    { name: 'The Pemberton Estate',  contact: 'c.pemberton@email.com',  status: 'Closed',    tier: 'Dynasty', last_contact: '2026-02-28', next_action: 'Onboarding follow-up',   closed_at: '2026-02-28T00:00:00Z' },
    { name: 'The Langford Archive',  contact: 'r.langford@email.com',   status: 'Proposal',  tier: 'Estate',  last_contact: '2026-03-20', next_action: 'Follow up on proposal',  closed_at: null },
    { name: 'Mrs. V. Ashworth',      contact: 'v.ashworth@email.com',   status: 'Demo',      tier: 'Estate',  last_contact: '2026-03-18', next_action: 'Send demo recap',        closed_at: null },
    { name: 'The Montague Family',   contact: 't.montague@email.com',   status: 'Contacted', tier: '',        last_contact: '2026-03-15', next_action: 'Book discovery call',    closed_at: null },
    { name: 'Dr. E. Calloway',       contact: 'e.calloway@email.com',   status: 'New',       tier: '',        last_contact: null,         next_action: 'Initial outreach',       closed_at: null },
    { name: 'The Ravenscroft Trust', contact: 'j.ravenscroft@trust.co', status: 'Lost',      tier: 'Estate',  last_contact: '2026-02-15', next_action: null,                     closed_at: null },
  ]

  const { data: insertedProspects, error: prospectsErr } = await supabase
    .from('prospects')
    .insert(prospects.map(p => ({ ...p, archivist_id: ARCHIVIST_ID })))
    .select()

  if (prospectsErr) {
    console.error('Error creating prospects:', prospectsErr.message)
    process.exit(1)
  }

  console.log(`✓ ${insertedProspects.length} prospects created`)

  // ── Commissions ────────────────────────────────────────────────────────────
  const closedProspects = insertedProspects.filter(p => p.status === 'Closed')

  const commissions = [
    ...closedProspects.map(p => ({
      archivist_id: ARCHIVIST_ID,
      prospect_id:  p.id,
      type:         'founding',
      amount_cents: 100000,
      status:       'paid',
      description:  `Founding — ${p.name}`,
      paid_at:      p.closed_at,
    })),
    { archivist_id: ARCHIVIST_ID, prospect_id: null, type: 'residual', amount_cents: 33600, status: 'paid',    description: 'Monthly residual — March 2026',    paid_at: '2026-03-15T00:00:00Z' },
    { archivist_id: ARCHIVIST_ID, prospect_id: null, type: 'residual', amount_cents: 28800, status: 'paid',    description: 'Monthly residual — February 2026', paid_at: '2026-02-15T00:00:00Z' },
    { archivist_id: ARCHIVIST_ID, prospect_id: null, type: 'residual', amount_cents: 28800, status: 'pending', description: 'Monthly residual — April 2026',    paid_at: null },
  ]

  const { error: commissionsErr } = await supabase
    .from('commissions')
    .insert(commissions)

  if (commissionsErr) {
    console.error('Error creating commissions:', commissionsErr.message)
    process.exit(1)
  }

  console.log(`✓ ${commissions.length} commission records created`)

  // ── Output ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log('DEMO_ARCHIVIST_ID=' + ARCHIVIST_ID)
  console.log('══════════════════════════════════════════════\n')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
