# iOS app rebuild, 2026-09-08

Runbook and record for the Basalith iOS app rebuild. Two repos changed:
`basalith-app` (the whole app) and `basalith-official` (five files under
`lib/auth` and `app/api`). Server deployed to production and the app signed
in end to end on 2026-09-09. Section 0 records the one thing that went wrong
between writing and shipping.

## 0. What actually blocked the first three builds (read this first)

The first production build launched to a pure black screen: no splash logo, no
spinner, no crash log. Three rounds of JavaScript guards (module-load
try/catch in `index.ts`, an error boundary, a session watchdog) changed
nothing, because the failure was below all of them.

A development client (`eas.json` profile `diagnose`: dev client, TestFlight
distribution, Debug config) connected to Metro showed it in one line:

    [runtime not ready]: Error: Cannot find native module 'ExpoAsset'

Cause: `@expo/vector-icons` was added with the SDK 54 range `^15.0.3`. npm
resolved 15.1.1, published for SDK 57, whose peer `expo-font >=14.0.4` pulled
`expo-font@57.0.3` and `expo-asset@57.0.16` to the top of `node_modules`,
above the SDK 54 copies `expo` itself depends on. The JavaScript from those
two packages asks for a native `ExpoAsset` module the SDK 54 native build
never produced. On the new architecture that is not a crash; the root view
stays empty.

Fix, in `package.json`: `@expo/vector-icons` pinned exactly to `15.0.3`, and
`expo-asset ~12.0.13` and `expo-font ~14.0.12` added as direct dependencies
so they win hoisting. `npm ls expo-asset expo-font` must show one version
each, all deduped. Use `npm ci`, never a bare `npm install`, before a build.

Lesson, general: `bundledNativeModules.json` ranges are not safe to install
by range once the next SDK has shipped. Pin exact versions for anything with
native code, and after any install run the mismatch scan:

    for d in node_modules/expo-* node_modules/@expo/*; do
      node -e "try{const v=require('./$d/package.json').version;if(/^5[5-9]\./.test(v))console.log('$d',v)}catch{}"
    done

Diagnostic path that worked, for next time: `eas build --profile diagnose`,
install from TestFlight, `npx expo start --dev-client --tunnel`, scan the QR.
The red screen on the phone is the answer. Expo Go cannot be used: the App
Store Expo Go is SDK 57 and refuses SDK 54 projects.

Second, smaller: the project's Supabase **Email OTP Length** was 8. The app
expects 6. Changed to 6 in Authentication -> Sign In / Providers -> Email.

## 1. Why the app was dark

Not a UI bug. The app never held a session.

`/api/archive/mobile-login` checked a bcrypt password and returned an archive
id, and the app resent that id on every call. The July 2026 auth sweep
(`docs/API_AUTH_SWEEP_2026-07.md`) closed every route to `getSessionUser()`,
which reads a Supabase Auth cookie. The app has no cookie jar, so after a
successful login every screen got a 401 and rendered its empty fallback.
`docs/API_AUTH_TRIAGE_2_2026-07.md` section 1 diagnosed this and prescribed an
"OTP build". This is that build.

A second, independent break: the dashboard navigated to a `Voice` route that
was never registered, so "Record answer" did nothing even before the 401s.

## 2. What changed on the server (basalith-official)

Four files. Type-checked against next@16.1.6 and @supabase/supabase-js. The new
test passes (8/8). The existing `unauth-access.test.ts` mocks `getSessionUser`
and is unaffected.

`lib/auth/getSessionUser.ts`
: Now resolves identity from `Authorization: Bearer <supabase access token>`
  first, then falls back to the cookie. The token is verified by
  `supabaseAdmin.auth.getUser(jwt)`; a forged or expired token is null, same
  as no cookie. Non-JWT bearer values (the 64-hex contributor
  `access_token` that `entity-chat` accepts) are skipped so that route's
  contributor branch is untouched. For owners of more than one archive, the
  `x-archive-id` header selects among OWNED archives only, alongside the
  existing `archive-id` cookie. `SessionRole` gains `'contributor'`.

`lib/auth/getSessionUser.test.ts`
: New. Pins the Bearer path, the rejection path, the non-JWT skip, header
  selection against a foreign id, and that the cookie path still works.

`app/api/archive/mobile-login/route.ts`
: Retired. Returns 410 with `code: MOBILE_LOGIN_RETIRED`. This removes the
  unthrottled password oracle and bcrypt DoS vector the triage named.
  `lib/billing/createArchive.ts` still mints `archive_credentials` rows; that
  is a separate follow-on and was not touched.

`app/api/mobile/contributor-session/route.ts`
: New. Session required. Body `{ archiveId }`. Returns the caller's own
  `contributors.access_token` for that archive, matched strictly on
  `session.email` and `status = 'active'`, plus the archive's name, owner
  name, language and `contributor_entity_access`. This is how the app reuses
  the existing `/api/contribute/*` surface without changing it.

`app/api/mobile/prepare-sign-in/route.ts`
: New, unauthenticated, always answers `{ ok: true }`. If the email is an
  active contributor on any archive, provisions a Supabase Auth user for it
  via `getOrCreateAuthUser(email, 'contributor')`. Owners, Guides and
  successors already have Auth users (Phase 3 backfill); contributors never
  did, so without this a family member could not sign in. Deliberately not an
  oracle: identical response for every input.

Before deploying, run `npx tsc --noEmit` in basalith-official. The only type
change is the new `'contributor'` literal on `SessionRole`; if anything in the
repo types an exhaustive `Record<Exclude<SessionRole, null>, ...>` it will
need the new key. None was found in the files read for this work.

Deploy: `vercel` (preview), sanity-check `/api/archive/mobile-login` returns
410 and `/api/mobile/my-archives` returns 401 with no auth, then David
promotes with `vercel --prod`. The app points at `https://basalith.ai`, so
the app cannot be tested end to end until this is in production.

## 3. Supabase Auth settings (dashboard, one-time)

Project `zmoauexzjfjloqxrkuma`.

1. Authentication -> Providers -> Email: enabled. "Confirm email" can stay
   as is. Nothing here creates users; `shouldCreateUser` is false in the app.
2. Authentication -> Emails -> **Magic link or OTP**. The web portal uses a
   `token_hash` link (not `{{ .ConfirmationURL }}`) and must keep working. Add the code to the same
   template so one email serves both. Suggested body (no em dashes):

   ```html
   <h2 style="font-family:Georgia,serif;font-weight:400;color:#0A0908">Your Basalith sign-in code</h2>
   <p style="font-size:32px;letter-spacing:8px;font-family:Menlo,Courier,monospace;font-weight:700;color:#0A0908">{{ .Token }}</p>
   <p style="font-family:Georgia,serif;color:#4A4640">Enter it in the Basalith app.</p>
   <p style="font-family:Georgia,serif;color:#4A4640">Signing in on the web instead? <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email" style="color:#8A6E30">Open your archive</a>.</p>
   ```

   Subject: `Your Basalith sign-in code`. Applied 2026-09-09.
3. Authentication -> Sign In / Providers -> Email -> **Email OTP Length: 6**
   (was 8). Applied 2026-09-09.
4. Authentication -> Rate Limits: leave the defaults unless the seed
   families report "too many attempts". The app enforces a 30 second resend
   cooldown on its side.
5. Authentication -> URL Configuration: no change. The app does not use
   redirect URLs (OTP is verified in-app with `verifyOtp`).

`signInWithOtp` with `shouldCreateUser: false` returns an error for an
unknown email. That is Supabase's own behaviour and the web portal has it
too; the app shows a generic "we do not have an archive under that email".

## 4. What changed in the app (basalith-app)

Every file under `src/` was rewritten. `npx tsc --noEmit` is clean.
`expo config --type prebuild` resolves without warnings.

Auth
: `src/lib/supabase.ts` holds a real Supabase session in SecureStore (chunked,
  SecureStore caps values at 2 KB). Email -> six-digit code -> session.
  `src/lib/api.ts` is one `request()` that adds the Bearer token and
  `x-archive-id`, retries once after a refresh on 401, then signs out cleanly
  if the session is really gone.

Roles
: `AuthContext` loads `/api/mobile/my-archives` and picks the stored or
  first owned archive. Owners get the five-tab app (Today, Capture, Archive,
  Entity, Settings). Contributors get a four-tab app (Questions, Add, Ask,
  Settings) built on the contribute routes via the token from
  `contributor-session`. One person can be both; the archive switcher moves
  between roles.

Screens (owner)
: Today (dashboard with daily session, spark, Guide, Mirror, photo question,
  family activity), Capture (voice / text / random thought, recent
  recordings), Archive hub (depth against the four stages, links to Photos,
  Timeline, Journal, Dates, Memory Game, Family), Entity chat with depth
  bars, Settings (language, email cadence, Face ID lock, export, privacy,
  terms, deletion request, sign out). Modals: Daily Session stepper, Voice
  reply, Text reply, Random Spark, Archive Switcher, Guide.

Screens (contributor)
: Questions (answer pending questions, photo questions show the photo),
  Add (upload photographs via signed URL, or write a memory of the owner),
  Ask (live entity chat when `contributor_entity_access != 'none'`,
  otherwise the wisdom exchange with the owner's confirmations shown).

Platform
: `expo-av` (deprecated) replaced by `expo-audio` behind one `useRecorder`
  hook. Vector icons instead of emoji. New app icon, splash and adaptive icon
  rendered from the web sigil (the old ones were the Expo placeholder grid).
  Version 1.1.0. Privacy manifest declared in `app.json`. Permission strings
  rewritten in plain language. `.env.example` now lists the anon key.

Removed
: `src/lib/auth.ts` (the archive-id-in-SecureStore "session"). Delete it:
  `git rm src/lib/auth.ts`. Nothing imports it.

Integrity
: No copy in the app states a number, guarantee or mechanism that is not
  real. The contributor Ask footer says "Answers from the archive. Says when
  it does not know." and never "verified" or "checked". The deletion request
  in Settings states the 12-month hold exactly as the governance policy does.

## 5. Build and submit

From `C:\Users\mrdav\basalith-app` in PowerShell:

```powershell
npm install
npx tsc --noEmit
git add -A
git rm src/lib/auth.ts
git commit -m "Rebuild: Supabase OTP auth, owner and contributor modes, expo-audio, App Store prep"
git push

# TestFlight
eas build --platform ios --profile production
eas submit --platform ios --latest
```

`npm install` is required: `package.json` and `package-lock.json` changed
(added `@expo/vector-icons`, `expo-audio`, `expo-constants`, `expo-linking`,
`react-native-url-polyfill`; removed `expo-av`).

The server change must be live in production before the TestFlight build is
useful. Order: deploy server, edit the Supabase email template, then build.

## 6. Test script for the first TestFlight build

1. Sign in with the Dr Ha archive email. Code arrives, six boxes fill, app
   opens on Today with the archive name and streak.
2. Pull to refresh Today. Photo and question render (signed URL, one hour).
3. Daily Session: complete one step by text and one by voice. Streak
   increments on the completion screen.
4. Capture tab: record ten seconds, send, transcript appears in Recent.
5. Entity tab: ask a question the archive can answer, then one it cannot.
   The second should decline rather than invent.
6. Settings: toggle Face ID lock on, kill the app, reopen: lock screen, Face
   ID, Today. Toggle it off.
7. Sign out. Sign in with an email that is a contributor to Cindy's archive
   (or use the switcher if the same email is both). Questions tab shows
   pending questions; answering one shows the owner's name in the toast.
8. Contributor Add: upload one photograph. It appears in the owner's Photos.
9. Kill the app with an old build's session: the new app finds no session
   and shows sign-in, not a blank screen.

## 7. Known follow-ons, not blocking

- `lib/billing/createArchive.ts` still generates a guessable client
  password into `archive_credentials`. Nothing reads it now. Stop minting it.
- Push notifications register on sign-in but no server path sends to
  `expo_push_token` today beyond what already existed.
- Journal voice entries, video upload and documents are web-only.
- The contributor "memory" in Add goes through `wisdom-exchange` as a
  statement so the owner sees and confirms it. A dedicated contributor
  free-deposit route would be cleaner.
- App Store listing still needs screenshots (6.7" and 6.1"), a support URL
  (`https://basalith.ai`) and a privacy policy URL
  (`https://basalith.ai/privacy`) entered in App Store Connect. The app
  declares email, photos, audio and user content as collected for app
  functionality, not tracking; the App Privacy questionnaire should match.
