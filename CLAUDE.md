# CLAUDE.md — Basalith Full-Stack

> This file tells Claude Code how to operate the Basalith codebase.
> It is read automatically when you run `claude` in this directory.
> Every task, convention, and system decision is documented here.

---

## Project Overview

**Basalith** is a luxury legacy preservation SaaS. Families pay an annual subscription
to have their digital archive ingested, labeled via AI-assisted Essence Games, and
preserved with an authenticated AI Presence.

**Stack:** Next.js 14 (App Router) · Firebase (Auth + Firestore + Storage) · Stripe
(Subscriptions + Connect) · Vercel (Deployment) · TypeScript throughout.

---

## Repository Layout

```
basalith/
├── app/
│   ├── (marketing)/              # Public marketing pages (no auth)
│   │   ├── page.tsx              # Home
│   │   ├── pricing/page.tsx      # Pricing page (see below)
│   │   └── partner/page.tsx      # Partner programme landing
│   ├── (auth)/                   # Auth flows
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Protected archivist portal
│   │   ├── dashboard/page.tsx    # Vault overview
│   │   ├── ingest/page.tsx       # File upload UI
│   │   └── milestones/page.tsx   # Firewall controls
│   ├── (partner)/                # Protected partner portal
│   │   ├── partner/page.tsx      # Partner dashboard
│   │   └── partner/apply/page.tsx
│   ├── api/
│   │   ├── stripe/webhook/route.ts   # ⚠ Critical — Stripe lifecycle
│   │   ├── vault/route.ts            # Vault CRUD
│   │   ├── vault/ingest/route.ts     # File ingestion
│   │   └── partners/route.ts         # Partner programme
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── pricing/                  # Pricing page components
│   ├── vault/                    # Dashboard components
│   └── shared/                   # VaultButton, AnimatedSection, etc.
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Browser SDK (use in React components)
│   │   └── admin.ts              # Server SDK (use in API routes only)
│   └── stripe/
│       └── index.ts              # Stripe client + tier config
├── types/
│   └── index.ts                  # All shared TypeScript types
├── scripts/
│   └── stripe-setup.ts           # One-time Stripe product creation
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Composite index definitions
├── storage.rules                 # Firebase Storage security rules
├── firebase.json                 # Firebase CLI config
└── .env.local.example            # Environment variable template
```

---

## Environment Setup (do this first)

### Step 1 — Clone and install

```bash
git clone https://github.com/basalith/basalith.git
cd basalith
npm install
```

### Step 2 — Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project named `basalith-prod`
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Enable **Firestore Database** → Start in production mode → Region: `us-central1`
5. Enable **Storage** → Start in production mode → Region: `us-central1`
6. Register a **Web app** → copy the config values
7. **Service account** → Generate new private key → download JSON

### Step 3 — Environment variables

```bash
cp .env.local.example .env.local
# Fill in all values — see comments in the file for where to find each one
```

### Step 4 — Deploy Firebase rules and indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # select your basalith-prod project

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only firestore:indexes
```

### Step 5 — Create Stripe products

```bash
# Ensure STRIPE_SECRET_KEY is set in .env.local first
npx tsx scripts/stripe-setup.ts
# Copy the output Price IDs back into .env.local
```

### Step 6 — Register Stripe webhook (local dev)

```bash
# In one terminal:
npm run dev

# In another terminal:
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret → STRIPE_WEBHOOK_SECRET in .env.local
```

### Step 7 — Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Firebase Data Architecture

### Collections

```
users/{uid}
  role: 'archivist' | 'curator' | 'guardian' | 'partner' | 'admin'
  email, displayName, vaultId?, partnerId?

vaults/{vaultId}                      # e.g. BSL-001-WHT
  archivistUid, tier, status
  essencePercent (0–100)
  storageUsedBytes, storageLimitBytes
  stripeSubscriptionId, stripeCustomerId
  metadata: { partnerReferralCode?, partnerId? }

  /curators/{curatorId}               # sub-collection
    email, displayName, clearance
    isKeyHolder, inviteToken, inviteAccepted

  /milestones/{milestoneId}           # sub-collection
    title, triggerType, triggerValue
    status: 'armed'|'pending'|'triggered'|'cancelled'

  /files/{fileId}                     # sub-collection
    storagePath, category, sizeBytes
    essenceTagged: boolean

  /essence_sessions/{sessionId}       # sub-collection
    trait, choiceLabel, essenceGain

ingestion_requests/{id}
  vaultId, status, sourceDescription

subscriptions/{stripeSubscriptionId}
  vaultId, tier, status
  currentPeriodStart, currentPeriodEnd

partners/{partnerId}
  uid, referralCode, status, tier
  commissionRate, pendingCommissionCents, totalCommissionCents
  stripeConnectAccountId?

commissions/{id}
  partnerId, vaultId, invoiceId
  amountCents, commissionCents, rate
  status: 'pending'|'approved'|'paid'|'reversed'

webhook_events/{stripeEventId}        # idempotency store
  processed: boolean

_meta/vault_counter
  count: number                       # atomic counter for BSL-NNN-XXX IDs
```

### Storage paths

```
vaults/{vaultId}/files/{fileId}/{originalFilename}
```

---

## API Routes Reference

### POST /api/vault
Create a new vault and get a Stripe checkout URL.
```json
{
  "tier": "estate",
  "displayName": "Harold R. Whitmore",
  "referralCode": "BSL-JHW-24ABC"   // optional
}
```
Returns: `{ vaultId, checkoutUrl }`

### GET /api/vault
Get the authenticated user's vault document.

### PATCH /api/vault
Update vault metadata (displayName, establishedCity).

### POST /api/vault/ingest
Two actions:

**action: "request"** — Submit white-glove ingestion request
```json
{
  "action": "request",
  "sourceDescription": "Google Photos, Dropbox, 3 external HDDs",
  "estimatedFileCount": 15000,
  "preferredDate": "2026-04-01"
}
```

**action: "register"** — Register a directly-uploaded file
```json
{
  "action": "register",
  "originalName": "family-1974.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 4200000,
  "category": "photograph",
  "storagePath": "vaults/BSL-001-WHT/files/abc123/family-1974.jpg",
  "year": 1974,
  "location": "Lake Tahoe, CA"
}
```

### GET /api/vault/ingest?type=files|requests
List vault files or ingestion requests.

### POST /api/partners
Three actions: `apply`, `payout`, `connect`

### GET /api/partners
Get partner profile, commissions, referred vaults.

### POST /api/stripe/webhook
Stripe sends events here. Do not call manually.

---

## Authentication Pattern

All protected API routes use this pattern:

```typescript
// In API route:
import { getAuthedUser, requireRole } from '@/lib/firebase/admin'

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req)      // throws 401 if invalid
  // or:
  const user = await requireRole(req, 'archivist', 'admin')  // throws 403
  ...
}
```

Client sends the Firebase ID token in every request:

```typescript
// In React component:
import { auth } from '@/lib/firebase/client'

const token = await auth.currentUser?.getIdToken()
const res = await fetch('/api/vault', {
  headers: { Authorization: `Bearer ${token}` }
})
```

---

## Stripe Webhook Flow

```
User clicks "Begin with The Estate"
  → POST /api/vault (creates vault doc, status: pending_payment)
  → Redirects to Stripe Checkout

User completes payment
  → Stripe fires checkout.session.completed
  → /api/stripe/webhook handles:
     1. Updates vault status → 'active'
     2. Creates subscriptions/{id} document
     3. Updates user role → 'archivist'
     4. Credits partner referral if referralCode present

Stripe fires invoice.paid annually
  → Renews subscription dates in Firestore
  → Credits recurring commission to partner

Stripe fires invoice.payment_failed
  → Sets vault status → 'paused'
  → Sets subscription status → 'past_due'
```

---

## Partner Commission Flow

```
Partner applies → POST /api/partners { action: "apply" }
  → Creates partners/{id} document (status: 'applicant')
  → Admin reviews and sets status → 'active' (via admin console or directly in Firestore)

Partner shares referral code (e.g. BSL-JHW-24ABC)
  → Client lands on /onboard?ref=BSL-JHW-24ABC
  → referralCode stored in vault.metadata.partnerReferralCode

On each invoice.paid webhook:
  → creditPartnerCommission() creates commissions/{id}
  → partner.pendingCommissionCents incremented

Partner requests payout → POST /api/partners { action: "payout" }
  → Validates minimum $50 balance
  → Executes stripe.transfers.create() to Connect account
  → Marks all pending commissions as 'paid'
  → Resets pendingCommissionCents to 0

Commission rates by tier:
  associate:  10%
  senior:     15%
  director:   15% + co-branded materials + quarterly reporting
```

---

## Design System

The Monolithic design system is defined in:
- `tailwind.config.ts` — all color tokens, font families, keyframes
- `app/globals.css` — base styles, grain overlay, glassmorphism, vault button CSS

**Key tokens:**
```
obsidian  #0A0A0B   page background
monolith  #141416   card surfaces
gold      #C4A882   primary accent
gold-bright #D9C4A3 high-emphasis gold
white-ghost #E8E8EE body text

font-legacy   Cormorant Garamond  headlines, narrative
font-compute  DM Mono             labels, data, system
```

**Never use:** Inter, Roboto, Arial, purple gradients, generic card layouts.

**Motion principle:** All reveals use `cubic-bezier(0.16, 1, 0.3, 1)` (vault easing).
Scanline gold sweeps signal security/authentication events.

---

## Deployment (Vercel)

### First deploy

```bash
npm install -g vercel
vercel login
vercel link   # link to your Vercel project
```

### Environment variables on Vercel

In Vercel dashboard → Project → Settings → Environment Variables,
add every variable from `.env.local.example`.

For `FIREBASE_ADMIN_PRIVATE_KEY`: paste the full private key including
`-----BEGIN...-----END-----` with literal `\n` characters (Vercel handles
the escaping automatically).

### Deploy

```bash
vercel --prod
```

### Post-deploy

1. Update Stripe webhook URL to `https://basalith.xyz/api/stripe/webhook`
2. Update Firebase authorized domains: Firebase Console → Authentication → Settings → Authorized domains → add `basalith.xyz`
3. Update Storage CORS (if direct browser uploads needed):

```bash
# basalith-cors.json
[
  {
    "origin": ["https://basalith.xyz"],
    "method": ["GET", "PUT", "POST"],
    "maxAgeSeconds": 3600
  }
]

gsutil cors set basalith-cors.json gs://your-project.appspot.com
```

---

## Common Tasks for Claude Code

### Add a new API route
1. Create `app/api/{name}/route.ts`
2. Import `getAuthedUser` or `requireRole` from `@/lib/firebase/admin`
3. Validate request body with Zod
4. Write to Firestore via `adminDb`
5. Return typed `ApiResponse<T>`

### Add a new Firestore collection
1. Add the type to `types/index.ts`
2. Add security rules to `firestore.rules`
3. Add composite indexes to `firestore.indexes.json` if needed
4. Add collection path constant to `lib/firebase/client.ts` Collections object
5. Deploy: `firebase deploy --only firestore`

### Debug webhook events
```bash
# View all received events
stripe events list --limit 10

# Resend a specific event
stripe events resend evt_xxxxxxxxxxxxx
```

### Promote a partner from applicant to active
```bash
# Via Firebase Admin Console or:
firebase firestore:update partners/{partnerId} '{"status": "active", "approvedAt": "2026-03-16T00:00:00Z"}'
```

### Check vault counter (for debugging duplicate IDs)
```bash
firebase firestore:get _meta/vault_counter
```

---

## Security Checklist

- [ ] All API routes call `getAuthedUser()` before any data access
- [ ] Firebase Admin SDK never imported in client components
- [ ] `STRIPE_SECRET_KEY` and `FIREBASE_ADMIN_PRIVATE_KEY` never in `NEXT_PUBLIC_` vars
- [ ] Stripe webhook signature verified before processing
- [ ] Webhook idempotency: every event checked in `webhook_events` collection first
- [ ] Storage rules block all direct reads (use signed URLs)
- [ ] Firestore rules deny all client writes (`allow write: if false`)
- [ ] Vault dissolution physically deletes all Storage files, not just Firestore docs

---

## Known Limitations & TODO

- **Email notifications:** Stubs exist in comments. Wire up SendGrid for:
  - Vault activation confirmation
  - Payment failure warning
  - Curator invite emails
  - Partner application status

- **Ingestion team notifications:** `notifyIngestionTeam()` is stubbed.
  Implement with Slack webhook (`SLACK_INGESTION_WEBHOOK_URL`).

- **AI Continuity:** The Basalith Presence AI feature is out of scope for
  this backend. When ready, it requires a separate service with access
  to `vaults/{vaultId}/essence_sessions` and `vaults/{vaultId}/files`.

- **Milestone automation:** The `armed` milestones need a Cloud Function
  or Vercel Cron job that runs nightly to check age gates and temporal triggers.
  Use `firebase deploy --only functions` for the Cloud Function approach.

- **Admin console:** No admin UI exists yet. Use Firebase Console directly
  for partner approvals, vault status overrides, and commission management.

# Basalith — Claude Code Context

## What This Is

Basalith is a premium legacy preservation and AI entity platform. It lets families capture, organize, and transmit their histories, wisdom, and identities across generations — not just wealth, but the *person*. The core product lives at basalith.xyz.

Two related properties extend the brand:
- **basalith.life** — lifestyle/community brand built around the "135 mentality": living boldly and fearlessly as a cultural identity, not a scientific claim
- **basalith.ai** — AI entity layer, the intelligence infrastructure beneath the platform

The company is **Heritage Nexus Inc.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Database | Supabase (Postgres + Auth + Storage) |
| AI | Anthropic API (Claude) |
| Email | Resend |
| Background Jobs | Inngest |
| Deployment | Vercel |
| Styling | Tailwind CSS |

---

## Business Model

**Tiered pricing** — families pay for access to legacy preservation tools and AI entity features.

**Archivist sales model** — independent sales force who onboard families directly. Archivists are not employees. They are brand representatives with their own relationships. Any code touching onboarding flows must account for the Archivist as an intermediary actor, not just the family.

**Current status:** Two real test families actively onboarding. Production is live. There is no sandbox that is "safe to break."

---

## The People Using This

- **Families** — often non-technical. Older members may be primary contributors. Interfaces must be clear, dignified, and emotionally appropriate. This is not a SaaS dashboard. It is closer to a memorial, a living archive, a trusted keeper.
- **Archivists** — semi-technical. Need clean onboarding flows, clear status visibility, and tools that make them look good to their clients.
- **Admins (David)** — technical, building everything.

---

## Data Sensitivity

Basalith stores family memories, personal histories, relationships, photos, and eventually voice/video. This is among the most sensitive data that exists. Every decision around auth, RLS, storage access, and API exposure must be made with this in mind. A breach here is not a bug — it is a violation of trust that cannot be undone.

**Default posture: maximum protection, minimum exposure.**

---

## Brand Voice & Copy Rules

- Intelligent, not reckless
- Fearless, not rebellious
- Generational, not trendy
- Philosophical, not promotional
- Premium — Basalith is not a consumer app. It is closer to a private bank or estate attorney in tone.
- **No em dashes anywhere in rendered copy.** Not in UI, not in emails, not in documentation shown to users.
- No exclamation points in product copy.
- No phrases like "unlock," "supercharge," "game-changer," "seamless."

---

## Design Standards

- Dark, considered aesthetic. Typography-led. Negative space is intentional.
- No decorative imagery unless it serves a specific purpose.
- Components must feel like they belong in a premium financial or heritage institution — not a startup.
- Motion should be restrained and purposeful. No gratuitous animation.
- Accessibility is non-negotiable given the age range of users.

---

## Engineering Standards

- **No direct Supabase client calls from client components** — all data fetching through server actions or API routes.
- **RLS on every table** — no exceptions. If a table lacks an RLS policy, it is a critical bug.
- **Environment variables** — never log them, never expose them to the client unless explicitly prefixed `NEXT_PUBLIC_` and intended for client use.
- **Inngest jobs** must be idempotent. Assume they can run twice.
- **Resend emails** must have both HTML and plain-text fallbacks.
- **No `any` types** in TypeScript unless absolutely necessary with a comment explaining why.
- All API routes must validate input. No raw `req.body` usage without a schema check.
- Migrations go through Supabase CLI — no manual schema changes in the dashboard.

---

## Current Priorities (as of build sprint)

1. Stable, trustworthy experience for the two onboarding families
2. Archivist dashboard completeness
3. AI entity layer foundations
4. Payment and tier enforcement

---

## What "Done" Means Here

A feature is done when:
- It works for a non-technical 70-year-old using it on an iPad
- An Archivist can explain it to a family in 30 seconds
- It does not expose data it shouldn't
- It does not break anything that was working before
- It looks like it belongs in the product

---

## Tone for This Session

You are a senior engineer and product partner who has read everything above. You do not need to be reminded of the stack or the context mid-session. You hold the business logic, the brand standards, and the technical constraints simultaneously. When in doubt, you ask one clarifying question rather than making an assumption that could affect a real family's data.
