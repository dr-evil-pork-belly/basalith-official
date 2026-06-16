// Client-safe (no server imports) so the dashboard card can import it directly.
// Decides whether a resurfaced deposit shows its `prompt` as quiet question
// context. Only source_types whose prompt is a genuine question belong here.
//
// 'deposit' is intentionally excluded: owner_deposits.prompt for direct deposits
// is the generic label "Direct deposit", not a question, so those render
// response-only. spark / mirror / journal prompts are real questions.
export const RESURFACING_PROMPT_WHITELIST = new Set(['spark', 'mirror', 'journal'])

export function shouldShowPrompt(sourceType: string, prompt: string | null | undefined): boolean {
  return (
    !!prompt &&
    prompt.trim().length > 0 &&
    RESURFACING_PROMPT_WHITELIST.has(sourceType)
  )
}
