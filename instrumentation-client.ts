import { initBotId } from 'botid/client/core'

// Vercel BotID, client half. October 12, 2026. See lib/botGuard.ts and
// docs/TRIAL_BOT_GUARD_2026-10-10.md.
//
// This file runs in the browser on every page. It starts an invisible
// challenge and attaches the result to requests for the paths listed here,
// and to no others. A route that calls checkBotId() and is NOT listed here
// classes every request as a bot, so the two lists must match:
//
//   path here                 route that checks it
//   /api/trial/start  POST    app/api/trial/start/route.ts

initBotId({
  protect: [
    { path: '/api/trial/start', method: 'POST' },
  ],
})
