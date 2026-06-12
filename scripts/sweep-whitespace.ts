import './load-env'

/**
 * One-off sweep for paste artifacts (carriage returns, newlines, tabs, or
 * runs of two or more spaces) in hand-seeded question tables:
 *   - elicitation_questions.text
 *   - b2b_questions.question / b2b_questions.description
 *
 * Dry run (default, reports only):
 *   npx tsx scripts/sweep-whitespace.ts
 *
 * Commit (collapses internal whitespace to single spaces, trims ends):
 *   npx tsx scripts/sweep-whitespace.ts --commit
 */

import { supabaseAdmin } from '../lib/supabase-admin'

const COMMIT = process.argv.includes('--commit')

const ARTIFACT_RE = /\r|\n|\t|  +/

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const rows: T[] = []

  for (;;) {
    const { data, error } = await supabaseAdmin.from(table).select(columns).range(from, from + pageSize - 1)
    if (error) {
      console.error(`ERROR fetching from ${table}: ${error.message}`)
      process.exit(1)
    }
    if (!data || data.length === 0) break

    rows.push(...(data as unknown as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function sweepColumn(table: string, idCol: string, textCol: string) {
  const rows = await fetchAllRows<Record<string, any>>(table, `${idCol}, ${textCol}`)

  const hits = rows
    .map(r => ({ id: r[idCol], oldText: r[textCol] as string | null }))
    .filter(r => typeof r.oldText === 'string' && ARTIFACT_RE.test(r.oldText))
    .map(r => ({ ...r, newText: clean(r.oldText!) }))

  console.log(`\n${table}.${textCol}: ${hits.length} hit(s) out of ${rows.length} row(s)`)

  for (const h of hits) {
    console.log(`  id ${h.id}:`)
    console.log(`    old: ${JSON.stringify(h.oldText)}`)
    console.log(`    new: ${JSON.stringify(h.newText)}`)

    if (h.oldText === h.newText) {
      console.log(`    (collapsing whitespace produces no change -- skipping)`)
      continue
    }

    if (COMMIT) {
      const { error } = await supabaseAdmin.from(table).update({ [textCol]: h.newText }).eq(idCol, h.id)
      if (error) {
        console.error(`    ERROR updating ${table} id ${h.id}: ${error.message}`)
        process.exit(1)
      }
      console.log(`    fixed`)
    }
  }

  return hits.filter(h => h.oldText !== h.newText).length
}

async function main() {
  console.log(`-- ${COMMIT ? 'COMMIT' : 'DRY RUN'} -----------------------------------------------`)

  let total = 0
  total += await sweepColumn('elicitation_questions', 'id', 'text')
  total += await sweepColumn('b2b_questions', 'id', 'question')
  total += await sweepColumn('b2b_questions', 'id', 'description')

  console.log(`\nTotal fixable hits: ${total}`)
  if (!COMMIT && total > 0) {
    console.log('This was a dry run. No rows were changed.')
    console.log('Re-run with --commit to apply.')
  }
  console.log('')
}

main().catch(err => {
  console.error('Sweep error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
