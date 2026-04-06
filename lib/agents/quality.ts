import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const qualityAgent = inngest.createFunction(
  {
    id:          'quality-agent',
    name:        'Quality Agent — Score and Prioritize',
    retries:     3,
    concurrency: { limit: 5 },
    triggers:    [{ event: 'photo/filtered' }],
  },
  async ({ event, step }) => {
    const {
      photographId,
      archiveId,
      storagePath,
      hasFaces,
      estimatedSubjects,
      contentType,
      appearsHistorical,
    } = event.data

    // ── 1. Signed URL ─────────────────────────────────────────────────────────
    const signedUrl = await step.run('get-signed-url', async () => {
      const { data } = await supabaseAdmin
        .storage
        .from('photographs')
        .createSignedUrl(storagePath, 300)
      return data?.signedUrl ?? null
    })

    if (!signedUrl) return { skipped: true, reason: 'No signed URL' }

    // ── 2. Download image ─────────────────────────────────────────────────────
    const imageData = await step.run('download-image', async () => {
      const response = await fetch(signedUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
      const buffer = await response.arrayBuffer()
      return {
        base64:      Buffer.from(buffer).toString('base64'),
        contentType: response.headers.get('content-type') || 'image/jpeg',
      }
    })

    // ── 3. Score archive value and estimate era ───────────────────────────────
    const analysis = await step.run('analyze-quality-and-era', async () => {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 400,
        messages:   [{
          role:    'user',
          content: [
            {
              type:   'image',
              source: {
                type:       'base64',
                media_type: imageData.contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data:       imageData.base64,
              },
            },
            {
              type: 'text',
              text: `Score this family archive photograph for archive value and estimate when it was taken.

ARCHIVE VALUE (0-100):
High (70-100): Faces clearly visible, candid emotional moments, rare or historical settings, group gatherings, milestone events, elderly people, children with family, pre-digital era photos
Medium (40-69): Faces present but small, posed formal photos, everyday moments, places with personal meaning
Lower (10-39): No faces, landscapes, buildings, objects with context

ERA ESTIMATION:
Analyze clothing, hairstyles, technology, photo quality, film grain, color processing, cars, furniture, architecture.
Examples: "1950s", "1967-1973", "early 1980s", "1990s", "2005-2010", "recent (2015+)", "unknown"

EMOTIONAL REGISTER:
joy, celebration, everyday, formal, solemn, candid, milestone, unknown

Respond ONLY with this JSON:
{
  "archive_value_score": 0-100,
  "era_estimate": "decade or range or null",
  "era_confidence": 0.0-1.0,
  "emotional_register": "one word",
  "is_candid": true or false,
  "has_elderly": true or false,
  "has_children": true or false,
  "is_group_photo": true or false,
  "setting": "indoor_home" or "outdoor" or "event_venue" or "workplace" or "school" or "travel" or "unknown",
  "priority_reason": "one sentence"
}`,
            },
          ],
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned)
      } catch {
        console.error('Quality parse error:', text)
        return {
          archive_value_score: 50,
          era_estimate:        null,
          era_confidence:      0,
          emotional_register:  'unknown',
          is_candid:           false,
          has_elderly:         false,
          has_children:        false,
          is_group_photo:      false,
          setting:             'unknown',
          priority_reason:     null,
        }
      }
    })

    // ── 4. Calculate final priority score ─────────────────────────────────────
    const priorityScore = await step.run('calculate-priority', async () => {
      let score = analysis.archive_value_score / 100

      if (hasFaces)                                      score += 0.08
      if (analysis.is_candid)                            score += 0.08
      if (analysis.has_elderly)                          score += 0.12
      if (analysis.has_children)                         score += 0.06
      if (analysis.is_group_photo)                       score += 0.05
      if (appearsHistorical)                             score += 0.10
      if (estimatedSubjects > 3)                         score += 0.04
      if (analysis.emotional_register === 'celebration') score += 0.08
      if (analysis.emotional_register === 'milestone')   score += 0.10
      if (analysis.emotional_register === 'joy')         score += 0.06

      if (analysis.era_estimate) {
        const era = String(analysis.era_estimate).toLowerCase()
        if (era.includes('193') || era.includes('194') || era.includes('195')) score += 0.18
        else if (era.includes('196') || era.includes('197'))                   score += 0.14
        else if (era.includes('198') || era.includes('199'))                   score += 0.08
        else if (era.includes('200'))                                           score += 0.04
      }

      return Math.min(score, 1.0)
    })

    // ── 5. Update photograph & decade coverage ────────────────────────────────
    await step.run('update-photograph-scores', async () => {
      await supabaseAdmin
        .from('photographs')
        .update({
          ai_quality_score: analysis.archive_value_score / 100,
          ai_era_estimate:  analysis.era_estimate,
          priority_score:   priorityScore,
        })
        .eq('id', photographId)

      // Update decade_coverage if era detected
      if (analysis.era_estimate) {
        const era         = String(analysis.era_estimate)
        const decadeMatch = era.match(/\b(1[89]\d0|20[012]\d0)s?\b/)
        if (decadeMatch) {
          const decade      = decadeMatch[1]
          const decadeLabel = decade.endsWith('0') ? decade + 's' : decade.slice(0, -1) + '0s'

          const { data: existing } = await supabaseAdmin
            .from('decade_coverage')
            .select('photo_count')
            .eq('archive_id', archiveId)
            .eq('decade', decadeLabel)
            .single()

          if (existing) {
            await supabaseAdmin
              .from('decade_coverage')
              .update({ photo_count: existing.photo_count + 1 })
              .eq('archive_id', archiveId)
              .eq('decade', decadeLabel)
          } else {
            await supabaseAdmin
              .from('decade_coverage')
              .insert({ archive_id: archiveId, decade: decadeLabel, photo_count: 1, labelled_count: 0 })
          }
        }
      }

      console.log(`Quality [${photographId}]: score=${priorityScore.toFixed(2)} era=${analysis.era_estimate}`)
    })

    return {
      photographId,
      priorityScore,
      archiveValueScore: analysis.archive_value_score,
      eraEstimate:       analysis.era_estimate,
      emotionalRegister: analysis.emotional_register,
    }
  },
)
