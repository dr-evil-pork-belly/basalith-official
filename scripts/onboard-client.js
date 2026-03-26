// scripts/onboard-client.js
// Creates a new client archive and outputs the credential string for Vercel.
//
// Usage:
//   node scripts/onboard-client.js \
//     --name "The Harrington Archive" \
//     --family "Harrington" \
//     --email "h@example.com" \
//     --tier estate \
//     --password "HarringtonVault2026!"

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
  const family   = arg('--family')
  const email    = arg('--email')
  const tier     = arg('--tier') || 'estate'
  const password = arg('--password')

  if (!name || !family || !email || !password) {
    console.error('Usage: node scripts/onboard-client.js --name "..." --family "..." --email "..." --password "..." [--tier archive|estate|dynasty]')
    process.exit(1)
  }

  console.log(`\nCreating archive for ${family} family…`)

  const { data, error } = await supabase
    .from('archives')
    .insert({
      name:        name.trim(),
      family_name: family.trim(),
      owner_email: email.trim(),
      tier:        tier.toLowerCase(),
      generation:  'Generation I',
      status:      'active',
    })
    .select('id, name')
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  const archiveId = data.id

  console.log('\n✓ Archive created')
  console.log('  Name:', data.name)
  console.log('  ID:  ', archiveId)
  console.log('\n────────────────────────────────────────────────────────────────')
  console.log('Add this entry to ARCHIVE_CREDENTIALS in Vercel env vars:')
  console.log()
  console.log(`  Append ,${password}:${archiveId} to ARCHIVE_CREDENTIALS`)
  console.log()
  console.log('Example (if ARCHIVE_CREDENTIALS is currently empty):')
  console.log(`  ARCHIVE_CREDENTIALS=${password}:${archiveId}`)
  console.log()
  console.log('Example (if adding to existing entries):')
  console.log(`  ARCHIVE_CREDENTIALS=<existing entries>,${password}:${archiveId}`)
  console.log('────────────────────────────────────────────────────────────────\n')
}

main().catch(err => { console.error(err); process.exit(1) })
