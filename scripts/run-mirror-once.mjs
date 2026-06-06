// One-off: generate a mirror reflection for a single archive and insert it.
// Run: DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/run-mirror-once.mjs
//
// Uses the exact logic/prompt from lib/generateMirror.ts and the same
// supabaseAdmin data path the app uses (PostgREST over HTTPS).

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const ARCHIVE_ID = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const anthropic = new Anthropic()

// "This Sunday" in UTC (today if today is Sunday), as YYYY-MM-DD.
function thisSundayUTC() {
  const d   = new Date()
  const add = (7 - d.getUTCDay()) % 7
  const sun = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add))
  return sun.toISOString().slice(0, 10)
}

// Verbatim port of lib/generateMirror.ts
async function generateMirror(archiveId, archiveName, deposits) {
  const systemPrompt = `You are the cognitive reference model of ${archiveName}. You have been listening to what they share. Your task is to reflect back what you are beginning to understand about them, based ONLY on what they have actually said.

This is not a summary. It is not praise. It is not analysis. It is the experience of being noticed by something that has been paying close attention.

Rules:
- Reference specific things they actually said. Never invent details.
- Notice one genuine thread, pattern, or quality that connects what they shared. Something true, not flattering.
- Be tentative and humble. Say "I am beginning to think" or "I notice" or "It seems" rather than declaring who they are. You are observing, not diagnosing.
- Be warm but never saccharine. Never say they are thoughtful, wise, special, or any generic compliment. Earn every word against what they actually said.
- The smallest, most ordinary detail is often the most revealing. A routine, a smell, a habit. Treat the ordinary as significant, because it is.
- Keep it short. Three to five sentences. A reflection, not an essay.
- Write in first person, addressed to them as "you."
- No em dashes. American English. No exclamation points.

Then, on a new line after the reflection, write exactly one question that follows naturally from what you noticed. The question should feel like pulling the next thread. Specific, gentle, easy to answer. Prefix it with THREAD: so it can be parsed out.`

  const context = [...deposits]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(d => `They shared: ${d.response}`)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 400,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: context }],
  })

  const text  = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const parts = text.split('THREAD:')
  return { reflection: parts[0].trim(), threadQuestion: parts.slice(1).join('THREAD:').trim() }
}

async function main() {
  const { data: archive, error: aerr } = await supabase
    .from('archives')
    .select('name, owner_name')
    .eq('id', ARCHIVE_ID)
    .single()
  if (aerr || !archive) throw new Error(`archive lookup failed: ${aerr?.message ?? 'not found'}`)

  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: deposits, error: derr } = await supabase
    .from('owner_deposits')
    .select('id, prompt, response, created_at')
    .eq('archive_id', ARCHIVE_ID)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  if (derr) throw new Error(`deposits query failed: ${derr.message}`)

  const list = (deposits ?? []).filter(d => d.response && String(d.response).trim().length > 0)
  console.log(`Archive:  ${archive.name}  (owner: ${archive.owner_name ?? 'n/a'})`)
  console.log(`Deposits in last 30 days (with text): ${list.length}`)
  if (list.length === 0) {
    console.log('No deposits to reflect on. Nothing inserted.')
    return
  }

  const { reflection, threadQuestion } = await generateMirror(ARCHIVE_ID, archive.name, list)
  if (!reflection) throw new Error('model returned an empty reflection')

  const weekOf = thisSundayUTC()
  const { data: inserted, error: ierr } = await supabase
    .from('mirror_reflections')
    .insert({
      archive_id:      ARCHIVE_ID,
      reflection,
      thread_question: threadQuestion,
      deposit_ids:     list.map(d => d.id),
      week_of:         weekOf,
    })
    .select('id, week_of, created_at')
    .single()
  if (ierr) throw new Error(`insert failed: ${ierr.message}`)

  console.log('\n=== INSERTED into mirror_reflections ===')
  console.log(`id:       ${inserted.id}`)
  console.log(`week_of:  ${inserted.week_of}`)
  console.log(`deposits: ${list.length}`)
  console.log('\n========== REFLECTION ==========\n')
  console.log(reflection)
  console.log('\n========== THREAD QUESTION ==========\n')
  console.log(threadQuestion)
  console.log('\n================================\n')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
