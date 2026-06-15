-- Homepage audience selector instrumentation.
-- Records which path a visitor picks ("Which are you here for?") so that
-- founder-versus-family interest can be counted from day one with no analytics
-- vendor. Privacy by design: the only data stored is the audience value and a
-- server timestamp. No PII, no cookies, no IP, no user agent.
--
-- Idempotent so it is safe to re-run against a fresh database.
create table if not exists audience_selections (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null check (audience in ('founder','family')),
  created_at timestamptz not null default now()
);

-- RLS on, with no policies. The service role bypasses RLS, so the track route
-- can still insert. With RLS enabled and zero policies, the anon and
-- authenticated roles are denied by default: nothing is readable or writable
-- from the client.
alter table audience_selections enable row level security;
