-- Referral credits. October 6, 2026.
-- Record: docs/LAUNCH_REVENUE_2026-10-06.md, section 8.
-- Writer: provisionOnFoundingFee in lib/inngest/billingFunctions.ts.
--
-- One row per paid referral. When a referred client pays, the Basalith that
-- referred them is owed a credit against its next renewal ($500 to start).
-- The row is the debt. The founder applies it in Stripe as a customer balance
-- credit and then marks the row applied. Nothing in the code applies it.
--
-- Additive. Touches no existing table. Pasted by hand into the Supabase SQL
-- editor; never run from the CLI or a script.

create table if not exists referral_credits (
  id                       uuid        primary key default gen_random_uuid(),
  referrer_archive_id      uuid        not null references archives(id),
  referred_archive_id      uuid        references archives(id),
  referred_subscription_id text        not null,
  amount_cents             integer     not null check (amount_cents > 0),
  status                   text        not null default 'pending'
                           check (status in ('pending','applied','void')),
  created_at               timestamptz not null default now(),
  applied_at               timestamptz,
  note                     text,
  -- An applied row says when. A row that is not applied has no applied_at.
  constraint referral_credits_applied_has_time
    check ((status = 'applied') = (applied_at is not null)),
  -- Nobody refers themselves.
  constraint referral_credits_not_self
    check (referred_archive_id is null or referred_archive_id <> referrer_archive_id)
);

-- One credit per paid subscription. This is what makes a provisioning retry a
-- no-op.
create unique index if not exists referral_credits_one_per_subscription
  on referral_credits (referred_subscription_id);

create index if not exists referral_credits_referrer
  on referral_credits (referrer_archive_id, status);

comment on table referral_credits is
  'One row per paid referral. The debt owed to the referring Basalith, applied by hand in Stripe.';
comment on column referral_credits.referrer_archive_id is
  'The Basalith owed the credit. For a contributor referral, the Basalith that contributor was invited to.';
comment on column referral_credits.status is
  'pending until the founder applies the credit in Stripe, then applied. void if the referred client is refunded.';

-- Supabase grants anon and authenticated seven privileges on every new table.
-- RLS with a service_role-only policy is the defense; the revoke makes it two.
alter table referral_credits enable row level security;

drop policy if exists "service_role_full_access" on referral_credits;
create policy "service_role_full_access" on referral_credits
  to service_role using (true) with check (true);

revoke all on table referral_credits from public, anon, authenticated;

-- Confirm after paste. Paste the output of all three back.
--
--   -- 1. Columns.
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'referral_credits' order by ordinal_position;
--
--   -- 2. Grants. Expect no row for anon, authenticated, or PUBLIC.
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_name = 'referral_credits' order by grantee, privilege_type;
--
--   -- 3. RLS on, one policy, service_role only.
--   select c.relrowsecurity, p.polname, p.polroles::regrole[]
--   from pg_class c left join pg_policy p on p.polrelid = c.oid
--   where c.relname = 'referral_credits';
