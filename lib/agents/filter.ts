import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const filterAgent = inngest.createFunction(
  {
    id:          'filter-agent',
    name:        'Filter Agent — Remove Noise',
    retries:     3,
    concurrency: { limit: 5 },
    triggers:    [{ event: 'photo/uploaded' }],
  },
  async ({ event, step }) => {
    const { photographId, archiveId, storagePath, uploadedBy } = event.data

    // ── 1. Archive info ───────────────────────────────────────────────────────
    const archiveInfo = await step.run('get-archive-info', async () => {
      const { data } = await supabaseAdmin
        .from('archives')
        .select('name, owner_name')
        .eq('id', archiveId)
        .single()
      return data
    })

    // ── 2. Signed URL ─────────────────────────────────────────────────────────
    const signedUrl = await step.run('get-signed-url', async () => {
      const { data } = await supabaseAdmin
        .storage
        .from('photographs')
        .createSignedUrl(storagePath, 300)
      if (!data?.signedUrl) throw new Error('Could not get signed URL')
      return data.signedUrl
    })

    // ── 3. Download image ─────────────────────────────────────────────────────
    const imageData = await step.run('download-image', async () => {
      const response = await fetch(signedUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
      const buffer = await response.arrayBuffer()
      return {
        base64:      Buffer.from(buffer).toString('base64'),
        contentType: response.headers.get('content-type') || 'image/jpeg',
      }
    })

    // ── 4. Claude Vision analysis ─────────────────────────────────────────────
    const analysis = await step.run('analyze-with-claude', async () => {
      const subjectName =
        archiveInfo?.owner_name || archiveInfo?.name || 'the archive subject'

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
              text: `You are analyzing a photograph for a family archive dedicated to preserving the life of ${subjectName}.

Family members are uploading from their phones. Many uploads will be completely unrelated to ${subjectName} or their family history.

Classify this photograph:

KEEP — belongs in this family archive:
  Photos of people (any generation)
  Family gatherings and events
  Meaningful places (home, hometown, travel)
  Historical moments worth preserving
  Documents with personal significance
  Old photographs (pre-digital era)
  Photos that appear to be family memories

REVIEW — unclear, needs human review:
  Groups where archive subject may or may not be present
  Places that might be meaningful but unclear
  Confidence below 80%

DISCARD — does not belong:
  Screenshots of texts, apps, websites
  Receipts, invoices, parking tickets
  Food photos with no people present
  Random objects, packages, products
  Memes, graphics, digital content
  Photos of TVs or computer screens
  Completely blurred or black frames
  Test shots or accidental photos
  Selfies in casual/unrelated contexts
  Photos clearly unrelated to family (e.g. nature shots with no people, random street scenes)

Respond ONLY with this JSON:
{
  "category": "KEEP" or "REVIEW" or "DISCARD",
  "confidence": 0.0 to 1.0,
  "reason": "one specific sentence",
  "content_type": "family_moment" or "portrait" or "event" or "place" or "document" or "screenshot" or "food" or "object" or "blurred" or "selfie_unrelated" or "nature" or "other",
  "has_faces": true or false,
  "estimated_subjects": number,
  "appears_historical": true or false,
  "archive_relevant": true or false
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
        console.error('Filter parse error:', text)
        return {
          category:          'REVIEW',
          confidence:        0.5,
          reason:            'Parse error — needs review',
          content_type:      'other',
          has_faces:         false,
          estimated_subjects: 0,
          appears_historical: false,
          archive_relevant:  false,
        }
      }
    })

    // ── 5. Update photograph record ───────────────────────────────────────────
    await step.run('update-photograph', async () => {
      let status = 'needs_review'
      if (analysis.category === 'KEEP'    && analysis.confidence >= 0.80) status = 'unlabelled'
      else if (analysis.category === 'DISCARD' && analysis.confidence >= 0.85) status = 'discarded'

      await supabaseAdmin
        .from('photographs')
        .update({
          ai_processed:    true,
          ai_filter_score: analysis.confidence,
          ai_category:     analysis.content_type,
          status,
        })
        .eq('id', photographId)

      console.log(`Filter [${photographId}]: ${analysis.category} (${analysis.confidence}) → ${status}`)
    })

    // ── 6. Trigger quality agent for kept photos ──────────────────────────────
    if (analysis.category === 'KEEP' && analysis.confidence >= 0.80) {
      await step.sendEvent('trigger-quality-agent', {
        name: 'photo/filtered',
        data: {
          photographId,
          archiveId,
          storagePath,
          hasFaces:          analysis.has_faces,
          estimatedSubjects: analysis.estimated_subjects,
          contentType:       analysis.content_type,
          appearsHistorical: analysis.appears_historical,
        },
      })
    }

    return {
      photographId,
      result:      analysis.category,
      confidence:  analysis.confidence,
      contentType: analysis.content_type,
    }
  },
)
