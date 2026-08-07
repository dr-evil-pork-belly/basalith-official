-- Reply token expiry for email_reply_sessions.
--
-- PASTE INTO THE SUPABASE SQL EDITOR. Do not run from a sandbox or the CLI.
-- Run the whole file in one go. The statements are ordered and step 4 depends
-- on step 2 having completed.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 20260514_email_reply_sessions.sql declared `expires_at timestamptz default
-- (now() + interval '7 days')`. That column never landed. Verified live on
-- August 6, 2026: the table has 12 columns and expires_at is not among them.
--
-- No consumer has ever checked expiry, in code or in intent. The inbound
-- handler's only guards were "token exists" and "session.replied". For a token
-- that was never used, the replied guard enforces nothing, so every unredeemed
-- token has been a permanent bearer credential that writes into a family
-- archive.
--
-- Measured on August 6, 2026, before this migration:
--
--     total sessions   821
--     replied           14   (1.7%)
--     UNREPLIED        807   <- live permanent credentials
--
--     age of the 807 unreplied:
--        0-30 days   408   (225 owner, 183 contributor)
--       30-60 days   309   (195 owner, 114 contributor)
--       60-90 days    90   ( 65 owner,  25 contributor)
--          90+ days     0
--       oldest 72.7 days, median 29.7 days
--
-- Mint rate is roughly 11 per day, so with no expiry this grows about 4,000 a
-- year with no ceiling.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY 30 DAYS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Every reply this system has ever received arrived fast. Of the 14 replied
-- sessions carrying a replied_at timestamp: median 0.02 days (about 30
-- minutes), maximum 3.05 days, and 14 of 14 within 7 days. Thirty days is
-- roughly ten times the observed maximum.
--
-- No email type in this system is a multi-turn conversation. `conversational`
-- is the largest unreplied bucket at 236, but cron/daily-reflection:104-105
-- picks that literal purely when the elicitation band is p1. It is a one-shot
-- daily question like every other type, and `replied` already enforces
-- one-shot. There is no mid-thread state a 30-day cut can sever. The only
-- thing it can break is someone who received an email more than 30 days ago
-- and still has not replied, which describes nobody in the observed data.
--
-- CAVEAT, stated plainly: n=14 is a 1.7% reply rate. That bounds what we have
-- observed. It does not establish how families behave. Thirty days was chosen
-- to sit far outside a small sample, not because the sample proves 30 is safe.
--
-- Effect of this backfill: 399 of the 807 unreplied tokens (49.4%) expire the
-- moment this runs, including the entire 30-90 day tail. The remaining 408
-- expire on a rolling basis within the month.
--
-- Shorter windows were considered and rejected: 7 days kills 85.6% at once and
-- 14 days kills 74.2%, both cutting close to observed behavior on a denominator
-- this small. Longer windows do not address the finding: 60 days clears 11.2%
-- and 90 days clears nothing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- NOT INCLUDED, DELIBERATELY
-- ─────────────────────────────────────────────────────────────────────────────
--
-- No reaper. Expiry is enforced on read, in lib/emailReplySessions.ts
-- resolveReplySession(). Expired rows stay so that a family replying late can
-- still be identified and sent the courtesy email. A row with no archive_id
-- resolvable is a reply we cannot answer.

-- ── 1. The column ───────────────────────────────────────────────────────────
ALTER TABLE email_reply_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ── 2. Backfill every existing row at created_at + 30 days ──────────────────
-- Applies to replied rows too. Harmless there (the replied guard already closed
-- them) and it keeps the column total, which is what makes step 4 safe.
UPDATE email_reply_sessions
SET    expires_at = created_at + interval '30 days'
WHERE  expires_at IS NULL;

-- ── 3. Default, as defense in depth ─────────────────────────────────────────
-- Application code sets expires_at explicitly on every mint
-- (lib/emailReplySessions.ts). This default exists so that an insert which
-- forgets still produces a bounded token instead of a permanent one. It is a
-- backstop, not the mechanism.
ALTER TABLE email_reply_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- ── 4. NOT NULL, so a null can never mean "never expires" again ─────────────
-- Safe only after step 2. On 821 rows the scan is instant.
ALTER TABLE email_reply_sessions
  ALTER COLUMN expires_at SET NOT NULL;

-- ── 5. Token lookup index ───────────────────────────────────────────────────
-- 20260514_email_reply_sessions.sql claims idx_email_reply_sessions_token, but
-- PostgREST cannot expose indexes and this repo has no raw Postgres credential,
-- so its presence is NOT CONFIRMED. IF NOT EXISTS makes this a no-op if it is
-- already there. The guard reads one row by token and checks expiry in
-- application code, so no composite index is needed.
CREATE INDEX IF NOT EXISTS idx_email_reply_sessions_token
  ON email_reply_sessions (token);

-- ── 6. Verify. Read the output, do not assume. ──────────────────────────────

-- 6a. Column shape.
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_name = 'email_reply_sessions'
  AND  column_name = 'expires_at';
-- expect: timestamptz, is_nullable = NO, default now() + 30 days

-- 6b. How many tokens went dead. This is the acceptance number.
SELECT
  count(*)                                                   AS total,
  count(*) FILTER (WHERE replied)                            AS replied,
  count(*) FILTER (WHERE NOT replied)                        AS unreplied,
  count(*) FILTER (WHERE NOT replied AND expires_at <= now()) AS unreplied_now_expired,
  count(*) FILTER (WHERE NOT replied AND expires_at >  now()) AS unreplied_still_live,
  count(*) FILTER (WHERE expires_at IS NULL)                 AS null_expiry
FROM email_reply_sessions;
-- expect, against the August 6 counts: total 821, replied 14, unreplied 807,
-- unreplied_now_expired 399, unreplied_still_live 408, null_expiry 0.
-- The two unreplied numbers drift with the clock and with overnight cron mints.
-- null_expiry MUST be 0.

-- 6c. Nothing survives past the window.
SELECT count(*) AS beyond_30_days_and_live
FROM   email_reply_sessions
WHERE  NOT replied
  AND  expires_at > now()
  AND  created_at < now() - interval '30 days';
-- expect: 0
