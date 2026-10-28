# AI word pass, October 28, 2026

## Why

Another founder said Basalith should not be on basalith.ai because it is not "a true AI company." Decision: keep the domain. The address is not a claim; the copy is. A sweep of the live production site (all 20 sitemap pages plus about 15 unlinked routes, server-rendered text) checked how hard the copy leans on "AI" and whether any page claims a mechanism that is not real.

Finding: the literal word "AI" appears four times on the public site and never in the homepage, a page title, or a meta description. The heavy word is "model" ("cognitive reference model"), which is fine as long as nothing claims the model is trained. Four places broke the integrity rule.

## Changes (written to disk in basalith-official, uncommitted)

1. **/succession** (`app/succession/page.tsx`): trust card title "Not a wrapper on a general AI." is now "Not a general model doing an impression." Basalith runs on the Anthropic API, which /security names and /churches states plainly, so the old line contradicted our own pages. Body copy unchanged (retrieval from one record plus the verifier).
2. **/privacy** (`app/privacy/page.tsx`, legal page, counsel should read): every "train your entity" claim removed. Nothing is trained per client; improvement is record level (Sept 28, 2026 decision), and Basalith has no general models.
   - Section 3 list item: "Train your entity on the authorized content of your Basalith only" is now "Answer questions from your entity using only the authorized content of your Basalith".
   - Section 3 italic line: now "We do not use the content of your Basalith to train any model. Your entity answers by reading your record, not by being trained on it."
   - Data Use for Training: "never used to train models for other users" is now "never used to train any model"; the closed-system paragraph now says the entity answers by reading what was deposited, and nothing deposited trains the entity, anyone else's entity, or any other model.
   - "Last updated" moved from August 2026 to October 2026.
   - Note: "never used to train any model" is a broader promise than before. It matches /data-ownership (never used to train AI models) and the record-level decision. If per-client training is ever built, this page changes first.
3. **/continuity** (`app/continuity/page.tsx`): "The model that trains your entity today" is now "The model that reads your record today."
4. **/about** (`app/about/page.tsx`): research list item "personalized language model fine tuning" is now "keeping language model answers grounded in a source." Basalith does not fine-tune; grounding is what G7 studies.
5. **Page titles**: 17 pages set a metadata title ending in " · Basalith" (one in "| Basalith") while `app/layout.tsx` already applies the template `%s · Basalith`, so browser tabs and search results read "Page · Basalith · Basalith." The suffix is removed from: resume, method, churches, integrity, apply, founding-session, press, partner, dependency-report, succession, welcome, privacy, about, pricing, faq, security, families. Layout untouched.

All files keep their original CRLF line endings. Only the lines above changed.

## Left as is

- /security "AI processing: Anthropic API" row: honest vendor disclosure.
- /data-ownership "never use the content of your Basalith to train AI models": a true negative commitment.
- /churches "What is underneath" section: the model for how to talk about the stack.

## Retired, same day

- **/posthumous-archive** (`app/posthumous-archive/page.tsx`): the Witness Basalith page was still live though Witness was pulled Sept 24, 2026 (unlinked, not in the sitemap). David chose to retire it. The page is now a 308 to /families with noindex, the same pattern as /custodianship and /join-archivists. No component, sitemap entry, or config linked to it. The `/witness/` disallow in robots.ts covers the old session route and is untouched.

## Not covered

- Signed-in portal, emails, and model-facing prompts were not swept.

## To ship

Run `npx tsc --noEmit`, then deploy. Post-deploy: open /succession, /privacy, /continuity, /about and check one tab title (for example /pricing should read "Pricing · Basalith").
