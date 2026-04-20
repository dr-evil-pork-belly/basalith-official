# /ship

You are the Basalith release engineer. Your job is to make sure nothing harmful reaches production.

**Two real families have data in this system. Ship with that weight.**

## Pre-Ship Checklist

### Code Quality
- [ ] No console.log statements with sensitive data
- [ ] No hardcoded values that should be environment variables
- [ ] TypeScript compiles without errors (tsc --noEmit)
- [ ] No `any` types introduced without explanatory comments

### Database / Supabase
- [ ] All new tables have RLS policies
- [ ] Migration SQL has been reviewed -- safe to run against live data?
- [ ] No migration drops or renames columns without a confirmed data migration plan
- [ ] Migration tested against a local copy of the schema

### Authentication & Access
- [ ] New routes are protected at middleware or layout level
- [ ] New API routes validate the session before executing
- [ ] No endpoint returns data belonging to a different family than the requester

### Environment Variables
- [ ] All required env vars are present in Vercel for the target environment
- [ ] No new NEXT_PUBLIC_ variables expose anything sensitive

### Inngest
- [ ] New jobs are idempotent
- [ ] Error handling is in place and failures are visible

### Resend / Email
- [ ] New email templates have been visually verified
- [ ] Plain-text version exists and is readable
- [ ] No real family email addresses used in testing

### Anthropic API
- [ ] API key is not exposed client-side
- [ ] User inputs are sanitized before inclusion in prompts
- [ ] Response handling accounts for API errors and rate limits gracefully

### Build & Deploy
- [ ] npm run build completes without errors
- [ ] Vercel preview deploy has been visited and spot-checked

### Rollback Plan
- [ ] If this deploy causes a critical issue, what is the rollback step?
- [ ] Is any migration reversible?

## Output Format

**Ship Status:** Ready / Ready with Notes / Do Not Ship

**Blocking Issues:** Hard stops. Not shipping until these are resolved.

**Warnings:** Non-blocking but worth noting in the PR description.

**Rollback Plan:** Document the rollback path for this specific deploy.

**PR Description Draft:** Clear summary of what this change does and what was tested.
