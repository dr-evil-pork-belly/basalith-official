# Basalith hyphen pass, 2026-10-01

Scope: every rendered string in basalith-official (site, portals, emails, SMS and WeChat replies, Legacy Guide certification content), basalith-xyz (white paper and research page), and basalith-app (iOS strings). 43 files, 206 lines. Copy only. No identifiers, routes, class names, CSS, keys, or model prompts were touched. Line counts and line endings are unchanged in every file.

## Rule applied

Compounds were opened ("one time", "sign in link", "fine tuning"), closed where the closed form is standard ("nonpayment", "nonrefundable", "cofounder", "postmortem", "multifactor", "rehashes", "midsentence"), or reworded where neither read well:

- "Sign-in is passwordless" to "Signing in is passwordless"; "A second factor at sign-in" to "A second factor when you sign in"; "your sign-in, ready" to "your login, ready"
- "Labels pre-suggested by AI" to "Labels suggested by AI"; "near-identical" to "nearly identical"
- "non-founder employee" to "employee outside the founding team"
- "Active post-transition" to "Active after transition"; "post-transition successor access" to "successor access after transition" (Terms)
- "one re-probe" to "one repeat probe"; "non-backed" to "unbacked" (white paper)
- "June-August 2024" to "June to August 2024"; "Re-record" to "Record again" (app)

## Left alone on purpose

- Decision-Making. It is the stored domain name used as a key across coverageProbes, coverageProbesPersonal, areaSeeds, b2bDomains, personalDomains, b2bScenarios, and it prints in the white paper. Renaming it means a data migration, so it needs its own slice.
- lib/demoPersonas (joey.ts, margaretChen.ts): "walk-away", "walk-ins", "held-away", "check-my-work". These are the demo record that demo-refusal-probe and the reliance probe read. Changing them changes the experimental record.
- Model prompts (entitySystemPrompt, life-event, gratitude-note, and the rest). Not rendered, and edits would move probe results.
- AES-256 and SHA-256. Algorithm names.
- Surnames, initials, cited titles and issue dates in the references: Igoa-Iraola, Fernandez-Araoz, Schulz M-A., "Fine-Tuned Language Models", "May-June 2021".
- Tagalog strings ("Mag-record", "araw-araw", and others). The hyphen is part of the spelling.
- File names and URLs that print in copy: data/training-pairs.json, basalith.ai/archivist-login.

## Before you ship

Run tsc and the test suite. No test asserts on a changed string in the two email tests checked (foundingWelcome, trialWarning); other tests were not read. The white paper edits are typographic except "unbacked" and "repeat probe"; decide whether that needs a line in the paper register.

## Files

### basalith-app/src/i18n.ts

4 lines. "Re-record" to "Record again"; "sign-in" to "sign in"; "six-digit" to "six digit" (x2)

### basalith-app/src/screens/SettingsScreen.tsx

1 lines. "12-month" to "12 month"

### basalith-app/src/screens/TimelineScreen.tsx

1 lines. "four-digit" to "four digit"

### basalith-official/app/about/page.tsx

3 lines. "hard-won" to "hard won"; "peer-reviewed" to "peer reviewed"; "fine-tuning" to "fine tuning"

### basalith-official/app/answers/founder-judgment-when-a-business-is-sold/page.tsx

1 lines. "one-time" to "one time"

### basalith-official/app/api/god/send-magic-link/route.ts

1 lines. "SIGN-IN" to "SIGN IN"

### basalith-official/app/api/wechat/webhook/route.ts

4 lines. "6-character" to "6 character" (x4)

### basalith-official/app/archive/dashboard/TrainingDataCard.tsx

1 lines. "fine-tuning" to "fine tuning"

### basalith-official/app/archive/label/LabelClient.tsx

1 lines. "Twenty-five.\nThis" to "Twenty five.\nThis"

### basalith-official/app/archive/voice/VoiceClient.tsx

1 lines. "20-year-old" to "20 year old"

### basalith-official/app/archive-login/page.tsx

3 lines. "sign-in" to "sign in" (x2); "Sign-In" to "Sign In"

### basalith-official/app/begin/BeginClient.tsx

2 lines. "sign-in" to "sign in" (x2)

### basalith-official/app/components/AncestorSection.tsx

3 lines. "great-grandmother" to "great grandmother"; "twenty-two" to "twenty two"; "great-grandchildren" to "great grandchildren"

### basalith-official/app/components/ContinuityPillar.tsx

1 lines. "great-grandchildren" to "great grandchildren"

### basalith-official/app/components/Hero.tsx

1 lines. "hard-won" to "hard won"

### basalith-official/app/components/IntelligenceLayer.tsx

3 lines. "near-identical" to "nearly identical"; "pre-suggested" to "suggested"; "face-indexed" to "face indexed"

### basalith-official/app/components/PricingFAQ.tsx

1 lines. "one-time" to "one time"

### basalith-official/app/components/PricingTiers.tsx

4 lines. "One-time" to "One time"; "ninety-day" to "ninety day"; "one-time" to "one time"; "12-month" to "12 month"

### basalith-official/app/components/ProductOverview.tsx

1 lines. "seven-layer" to "seven layer"

### basalith-official/app/components/home/HomeClosing.tsx

1 lines. "forward-thinking" to "forward thinking"

### basalith-official/app/contribute/[token]/ContributeClient.tsx

1 lines. "call-in" to "call in"

### basalith-official/app/families/page.tsx

1 lines. "Lower-confidence" to "Lower confidence"

### basalith-official/app/faq/page.tsx

2 lines. "one-time" to "one time" (x4)

### basalith-official/app/method/page.tsx

3 lines. "First-person" to "First person"; "co-founder" to "cofounder"; "long-tenured" to "long tenured"; "High-stakes" to "High stakes"

### basalith-official/app/posthumous-archive/page.tsx

2 lines. "90-minute" to "90 minute"; "One-Time" to "One Time"

### basalith-official/app/pricing/page.tsx

7 lines. "one-time" to "one time"; "sign-in" to "login"; "C-Corp" to "C Corp"; "append-only" to "append only"; "ninety-day" to "ninety day"; "(one-time)</p>" to "(one time)</p>"; "one-time</p>" to "one time</p>"

### basalith-official/app/privacy/page.tsx

4 lines. "general-purpose" to "general purpose"; "industry-standard" to "industry standard"; "non-payment" to "nonpayment"; "third-party" to "third party"

### basalith-official/app/security/page.tsx

8 lines. "Sign-in" to "Signing in"; "one-time" to "one time" (x2); "64-character" to "64 character"; "server-side" to "server side"; "signed-in" to "signed in"; "Multi-Factor" to "Multifactor"; "style={BODY}>Sign-in" to "style={BODY}>Signing in"; "two-factor" to "two factor"; "at sign-in" to "when you sign in"

### basalith-official/app/succession/login/page.tsx

4 lines. "sign-in" to "sign in" (x3); "Sign-In" to "Sign In"

### basalith-official/app/succession/page.tsx

5 lines. "long-range" to "long range"; "append-only" to "append only"; "ninety-day" to "ninety day"; "post-transition" to "after transition"; "(one-time)" to "(one time)"

### basalith-official/app/terms/page.tsx

3 lines. "one-time" to "one time"; "non-refundable" to "nonrefundable"; "post-transition" to ""; "" to "after transition"; "12-month" to "12 month"; "non-payment" to "nonpayment"

### basalith-official/app/welcome/page.tsx

3 lines. "sign-in" to "sign in" (x3)

### basalith-official/app/what-is-basalith/page.tsx

1 lines. "BAS-uh-lith" to "BAS uh lith"

### basalith-official/app/witness/[sessionId]/WitnessClient.tsx

1 lines. "great-grandchildren" to "great grandchildren"

### basalith-official/lib/b2bScenarios.ts

4 lines. "non-founder" to ""; "" to "outside the founding team"; "long-tenured" to "long tenured"; "high-stakes" to "high stakes"; "co-founder" to "cofounder"

### basalith-official/lib/certificationContent.ts

32 lines. "person-specific" to "person specific" (x2); "Person-specific" to "Person specific"; "fine-tunable" to "fine tunable"; "67-year-old" to "67 year old"; "first-generation" to "first generation"; "fine-tuning" to "fine tuning"; "commission-based" to "commission based"; "70-year-old" to "70 year old"; "fine-tuning?" to "fine tuning?"; "non-negotiable?" to "nonnegotiable?"; "fine-tune" to "fine tune"; "expectation-setting" to "expectation setting" (x2); "mid-sentence" to "midsentence" (x2); "follow-up" to "follow up" (x9); "90-minute" to "90 minute"; "follow-ups" to "follow ups" (x2); "warm-up" to "warmup"; "one-sentence" to "one sentence"; "re-read" to "reread"; "first-year" to "first year"; "client-facing" to "client facing" (x2); "check-in" to "check in"; "system-generated" to "system generated"; "re-engage" to "reengage"

### basalith-official/lib/dailyReflections.ts

1 lines. "20-year-old" to "20 year old"

### basalith-official/lib/emails/foundingWelcome.ts

4 lines. "sign-in" to "sign in" (x4)

### basalith-official/lib/pauseEmails.ts

1 lines. "sign-in" to "sign in"

### basalith-xyz/app/page.tsx

64 lines. "Question-aware" to "Question aware"; "read-only" to "read only" (x2); "append-only" to "append only" (x2); "highest-weighted" to "highest weighted"; "near-term" to "near term"; "21st-century" to "21st century"; "C-suite" to "C suite" (x2); "first-person" to "first person"; "well-established" to "well established"; "owner-operator&apos;s" to "owner operator&apos;s"; "half-people" to "half people"; "multi-layer" to "multilayer"; "long-term" to "long term"; "real-time" to "real time" (x2); "MODEL-DRIVEN" to "MODEL DRIVEN"; "re-probe" to "repeat probe"; "twenty-five" to "twenty five" (x2); "ninety-minute" to "ninety minute"; "open-ended" to "open ended" (x3); "thirty-eight" to "thirty eight"; "Thirty-seven" to "Thirty seven"; "thirty-one" to "thirty one"; "in-character" to "in character"; "second-most-common" to "second most common"; "seventy-three" to "seventy three"; "non-backed" to "unbacked"; "byte-identical" to "byte identical"; "question-aware" to "question aware"; "lowest-scoring" to "lowest scoring"; "run-to-run" to "run to run"; "per-question" to "per question"; "per-owner" to "per owner" (x3); "fine-tuning" to "fine tuning" (x6); "parameter-efficient fine-tuning" to "parameter efficient fine tuning"; "Fine-tuning" to "Fine tuning" (x2); "forty-eight" to "forty eight" (x2); "re-baselined" to "rebaselined"; "early-stage" to "early stage"; "cross-referencing" to "cross referencing"; "Post-Mortem" to "Postmortem"; "APPEND-ONLY" to "APPEND ONLY"; "THIRD-PARTY" to "THIRD PARTY"; "time-limited" to "time limited"; "NON-PAYMENT" to "NONPAYMENT"; "ninety-day" to "ninety day"; "re-hashes" to "rehashes" (x2); "same-person" to "same person"; "different-person" to "different person"; "fine-tuned" to "fine tuned" (x2); "per-user fine-tuning" to "per user fine tuning"; "quality-screened" to "quality screened"; "sole-authored" to "sole authored"; "post-mortem" to "postmortem"; "28-study" to "28 study"; "AI-generated" to "AI generated"; "June-August" to "June to August"; "Same-author" to "Same author"; "different-author" to "different author"; "Quality-screened" to "Quality screened"; "Per-user" to "Per user"; "position-taking" to "position taking"

### basalith-xyz/app/research/page.tsx

12 lines. "28-study" to "28 study"; "C-suite" to "C suite" (x2); "June-August" to "June to August"; "AI-generated" to "AI generated"; "fine-tuned" to "fine tuned"; "fine-tuning" to "fine tuning" (x2); "Fine-tuned" to "Fine tuned"; "high-quality" to "high quality"; "quality-scoring" to "quality scoring"; "quality-screened" to "quality screened"; "per-user parameter-efficient fine-tuning" to "per user parameter efficient fine tuning"; "per-user fine-tuning" to "per user fine tuning"; "Per-user" to "Per user"; "first-person" to "first person"; "sole-authored" to "sole authored"; "position-taking" to "position taking"

### basalith-xyz/components/ArchDiagram.tsx

4 lines. "model-driven" to "model driven"; "self-report" to "self report"; "APPEND-ONLY" to "APPEND ONLY"; "NON-BACKED" to "UNBACKED"

### basalith-xyz/components/VersionBanner.tsx

1 lines. "fine-tuning" to "fine tuning"; "post-mortem" to "postmortem"
