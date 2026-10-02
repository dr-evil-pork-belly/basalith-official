# AI writing tells pass, October 2, 2026

Across basalith.ai (basalith-official), basalith.xyz (basalith-xyz) and
basalith.life (basalith-life). Written to disk by Cowork, uncommitted.

## Why

Graphite compared Claude Opus 5.5 output with human articles written before
ChatGPT and listed the phrases Opus uses far more often than people do. This
copy has been drafted with Claude, so it was checked against that list.
Sources: Gizmodo and TechCrunch coverage on October 1, 2026, and Graphite's
"AI tells: Opus 5.5 update" page.

The list, with how much more often Opus 5.5 uses each than people do:

| Family | Phrases |
|---|---|
| Flagging importance | "this matters" 116x, "why ___ matters" 92x, "matters most" 12x, "just as important" 13x |
| Transitions | "looking ahead the" 40x, "adds another layer" 27x, "what comes next" 24x, "in practice" 7x |
| Contrast | "is more than a ___ it" 98x, "rather than simply" 32x, "not only about" 13x, "instead it" 8x |
| Evaluative words | "dependable" 23x, "steady" 11x, "thoughtful" 9x, "meaningful" 8x |
| Helpfulness (compared with Opus 5) | "is especially helpful", "can help you", "makes it easier", "helps you avoid" |

## Method

A scan of every reader-facing source file staged from the three repos: pages,
components, email templates, cron and Twilio routes, question banks, and the
mobile companion prompt. Tests, comments and identifiers were excluded. The scan
returned 55 raw hits. Most were code, comments, or rules that ban these words.
Every hit in copy a reader sees or hears is fixed below or listed under "Left
alone, on purpose".

## Changed

basalith.ai
- /families: "This is why the method matters, and why now matters." became "That is the method, and it is why the time to start is now."
- /about: "It is not only a business problem." became "It is a family problem too."
- /continuity: "That matters because the tools will change." became "The tools will change."
- /security: "So the advice that matters is about that account" became "So the best advice we can give is about that account"
- /founding-session: "What you say matters. How you say it matters more." became "What you say is half of it. How you say it is the other half."
- "what comes next" became "where to go from here" in the first read line on /pricing, /founding-session, the Founding panel, and the Founding complete email (HTML and text).
- Dashboard photo line: "A meaningful record." became "A real record now."
- Dates form placeholder: "why this date matters" became "about this day".
- Gratitude email (contributors): "That matters more than you know." became "Thank you for that." The Chinese line was changed to match.
- Phone line (Twilio): "Tell me a memory that matters to you." became "Tell me about a memory you still think about." The continue prompt says the same.
- Weekly question bank (`lib/weeklyPrompts.ts`, sent by the weekly prompt cron): "matters most" and "in practice" removed. Also fixed: **27 English questions carried em dashes**, which the copy rules ban, mostly in the "Not X, Y" rhythm. Every one was rewritten as plain questions. The Chinese and Cantonese questions keep the Chinese double dash, which is standard punctuation in those languages.
- `lib/dailyReflections.ts`: the same two questions. Nothing imports this file today.
- Model prompts: the annual preview prompt no longer asks for something "meaningful", and the mobile companion's prompt no longer says "meaningful" three times. Words in a prompt leak into what the model writes. Neither file is `entitySystemPrompt.ts`, so the same day A/B rule does not apply.
- CLAUDE.md section 8 now lists these phrases, so Claude Code avoids them.

basalith.xyz
- "it is the part of this system that matters most" became "it is the part of this system everything else depends on".
- "cognitive signatures differ meaningfully between individuals" became "differ from one person to the next" (paper) and "differ between individuals" (research page).
- "Fifty or more ... produce meaningful coverage" became "cover a real share of how a person decides".
- "a stronger promise in the only way that matters" became "a stronger promise where it counts".
- The correction label "WHAT THIS DOES NOT ESTABLISH" became "WHAT THIS DOES NOT SHOW". "does not establish" is the top tell for OpenAI's Astra.

None of these change a claim, a number or a mechanism.

basalith.life
- "Or it can help you hold on to" became "Or it can work for you, and keep hold of".
- Three "Not X. Y." fragments cut ("Not all at once.", "Not polished. True.", "Not a copy of you. The real one, kept true.").

## Left alone, on purpose

- "can provide" in /pricing FAQ (license language) and on /posthumous-archive. This is ordinary usage.
- "before it matters materially" in a B2B scenario. This is a business idiom.
- `lib/certificationContent.ts` has five hits. It is the Legacy Guide certification, and the Guide portal was deleted September 20.
- `app/components/IntelligenceLayer.tsx` says "Our system handles what comes next." Nothing imports it.
- basalith.xyz research page: "exists only in practice" (Polanyi's sense) and "with meaningful accuracy" (a summary of Simchon et al.). Rewording that one would change what the paper is said to show. Check the paper first.
- The prompts in `generateMirror.ts` and `selectNextQuestion.ts` contain "thoughtful" only to ban it as generic praise.

## Not covered by the list

The bigger pattern is the "Not X. Y." fragment pair. It is not on Graphite's
public list, but it is the same contrast family. A rough count: 18 in
basalith-official/app, 37 in basalith-official/lib (mostly question banks and
prompts), and 2 on basalith.xyz. Some are deliberate and allowed ("Not a wrapper
on a general AI."). Thinning the rest is a judgment call for David, done one
page at a time.

## Verify before deploy

- `npx tsc --noEmit` in basalith-official and basalith-xyz. Every edited file was syntax checked in the cloud copy, but these two repos were not type checked there.
- basalith.life: tsc clean in the cloud copy. It ships with `scripts/ship-2026-10-02.ps1`.
