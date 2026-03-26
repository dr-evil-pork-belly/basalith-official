// scripts/onboard-archivist.js
// Creates a new archivist record and outputs the credential string for Vercel.
//
// Usage:
//   node scripts/onboard-archivist.js \
//     --name "James Whitmore" \
//     --email "james@example.com" \
//     --password "JamesVault2026!"

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : null
}

async function main() {
  const name     = arg('--name')
  const email    = arg('--email')
  const password = arg('--password')
  const rank     = arg('--rank') || 'Provisional Archivist'

  if (!name || !email || !password) {
    console.error('Usage: node scripts/onboard-archivist.js --name "..." --email "..." --password "..." [--rank "Active Archivist"]')
    process.exit(1)
  }

  console.log(`\nCreating archivist record for ${name}…`)

  // Check for duplicate email
  const { data: existing } = await supabase
    .from('archivists')
    .select('id')
    .eq('email', email.trim())
    .single()

  if (existing) {
    console.error(`Error: An archivist with email ${email} already exists (id: ${existing.id})`)
    process.exit(1)
  }

  const { data, error } = await supabase
    .from('archivists')
    .insert({
      name:   name.trim(),
      email:  email.trim(),
      rank:   rank,
      status: 'active',
    })
    .select('id, name, rank')
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  const archivistId = data.id

  console.log('\n✓ Archivist created')
  console.log('  Name:', data.name)
  console.log('  Rank:', data.rank)
  console.log('  ID:  ', archivistId)
  console.log('\n────────────────────────────────────────────────────────────────')
  console.log('Add this entry to ARCHIVIST_CREDENTIALS in Vercel env vars:')
  console.log()
  console.log(`  Append ,${password}:${archivistId} to ARCHIVIST_CREDENTIALS`)
  console.log()
  console.log('Example (if ARCHIVIST_CREDENTIALS is currently empty):')
  console.log(`  ARCHIVIST_CREDENTIALS=${password}:${archivistId}`)
  console.log()
  console.log('Example (if adding to existing entries):')
  console.log(`  ARCHIVIST_CREDENTIALS=<existing entries>,${password}:${archivistId}`)
  console.log('────────────────────────────────────────────────────────────────\n')
}

main().catch(err => { console.error(err); process.exit(1) })
