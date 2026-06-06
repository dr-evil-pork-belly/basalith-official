import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * Generates a weekly "mirror" reflection for an archive: the experience of being
 * noticed by the entity that has been listening. Returns the reflection and a
 * single thread question that pulls the next memory loose.
 *
 * Throws on any failure so the caller (the weekly cron) can skip this archive.
 */
export async function generateMirror(
  archiveId:   string,
  archiveName: string,
  deposits:    Array<{ id: string; prompt: string; response: string; created_at: string }>,
): Promise<{ reflection: string; threadQuestion: string }> {
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

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: context }],
    })

    const text  = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const parts = text.split('THREAD:')

    const reflection     = parts[0].trim()
    const threadQuestion = parts.slice(1).join('THREAD:').trim()

    return { reflection, threadQuestion }
  } catch (err) {
    throw new Error(
      `generateMirror failed for archive ${archiveId} (${archiveName}): ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
