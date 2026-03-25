const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seed() {
  const { data, error } = await supabase
    .from('archives')
    .insert({
      name:        'The Whitfield Archive',
      family_name: 'Whitfield',
      owner_email: 'demo@basalith.xyz',
      tier:        'estate',
      generation:  'Generation I',
      status:      'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log('Demo archive created.')
  console.log('Archive ID:', data.id)
  console.log('')
  console.log("Add this to your archive pages:")
  console.log(`const DEMO_ARCHIVE_ID = '${data.id}'`)
}

seed()
