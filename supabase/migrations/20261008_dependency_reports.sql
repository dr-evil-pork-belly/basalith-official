-- Key person dependency reports. Slice 2, October 8, 2026.
-- Record: docs/DEPENDENCY_REPORT_SLICE_2_2026-10-08.md.
-- Pure core: lib/dependencyReport.ts, lib/dependencyIntake.ts (slice 1).
-- Writer: none yet. The assessment sequence (slice 3) is the first.
--
-- One row per ordered assessment: one named buyer, one founder, one report.
-- The buyer is fixed at order time and is the only recipient. The founder sees
-- the finished report first and releases it or does not. Either way the row
-- closes, and the buyer is told which.
--
-- The report column is a snapshot of what buildDependencyReport returned when
-- the report was built. A page renders the snapshot and never recomputes, so
-- what the founder released is what the buyer reads.
--
-- RETENTION. A closed row gets purge_after = closed_at + 90 days. The purge
-- deletes the founder's assessment record (the archives row and everything
-- under it) and clears intake and report on this row. The row itself stays:
-- who ordered, what was paid, and how it ended. If the founder becomes a
-- paying client first, converted_at is set, purge_after is cleared, and the
-- record is not deleted.
--
-- Additive. Touches no existing table. Pasted by hand into the Supabase SQL
-- editor; never run from the CLI or a script.

create table if not exists dependency_reports (
  id                uuid        primary key default gen_random_uuid(),

  -- The founder's assessment record. Null before the founder starts, and null
  -- again after the purge deletes it.
  archive_id        uuid        references archives(id) on delete set null,

  -- The named buyer. Fixed at order time.
  buyer_name        text        not null,
  buyer_email       text        not null check (buyer_email = lower(buyer_email)),
  buyer_org         text,

  -- The founder being assessed, as the buyer named them.
  founder_name      text        not null,
  founder_email     text        not null check (founder_email = lower(founder_email)),

  -- The literal fee charged for this order.
  amount_cents      integer     not null check (amount_cents > 0),

  status            text        not null default 'ordered'
                    check (status in ('ordered','capturing','ready','released','not_released','not_completed')),

  -- The founder's eight answers (validateIntake), and when they were given.
  intake            jsonb,
  intake_at         timestamptz,

  -- The two coverage runs the report was built from. coverage_runs rows go
  -- when the archive goes, so these fall to null at the purge.
  run_a_id          uuid        references coverage_runs(id) on delete set null,
  run_b_id          uuid        references coverage_runs(id) on delete set null,
  probe_set_version text,

  -- The snapshot, and when it was built.
  report            jsonb,
  report_built_at   timestamptz,

  released_at       timestamptz,
  closed_at         timestamptz,
  buyer_notified_at timestamptz,

  converted_at      timestamptz,
  purge_after       timestamptz,
  purged_at         timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- A released row says when. No other row has a release time.
  constraint dependency_reports_released_has_time
    check ((status = 'released') = (released_at is not null)),

  -- The three closed states carry closed_at. The three open ones do not.
  constraint dependency_reports_closed_has_time
    check ((status in ('released','not_released','not_completed')) = (closed_at is not null)),

  -- A report that is ready or released exists, until the purge clears it.
  constraint dependency_reports_ready_has_report
    check (status not in ('ready','released') or report is not null or purged_at is not null),

  -- A snapshot was built from an intake and carries its build time.
  constraint dependency_reports_report_has_parts
    check (report is null or (intake is not null and report_built_at is not null)),

  -- Two readings are two different runs.
  constraint dependency_reports_runs_distinct
    check (run_a_id is null or run_b_id is null or run_a_id <> run_b_id),

  -- Only a closed row is scheduled for purge, and a converted one never is.
  constraint dependency_reports_purge_needs_close
    check (purge_after is null or (closed_at is not null and converted_at is null)),

  -- A purged row holds no answers and no report.
  constraint dependency_reports_purged_is_empty
    check (purged_at is null or (intake is null and report is null))
);

-- One assessment per founder record.
create unique index if not exists dependency_reports_one_per_archive
  on dependency_reports (archive_id)
  where archive_id is not null;

-- What the purge job selects on.
create index if not exists dependency_reports_purge_due
  on dependency_reports (purge_after)
  where purged_at is null and purge_after is not null;

create index if not exists dependency_reports_buyer
  on dependency_reports (buyer_email);

comment on table dependency_reports is
  'One row per ordered key person dependency assessment. Named buyer, one founder, one report snapshot.';
comment on column dependency_reports.status is
  'ordered: paid, founder invited. capturing: founder started. ready: report built, founder deciding. released: founder released it to the buyer. not_released: report was built and the founder did not release it. not_completed: the founder never finished.';
comment on column dependency_reports.report is
  'Snapshot of buildDependencyReport output at build time. Rendered as stored, never recomputed. Cleared at purge.';
comment on column dependency_reports.purge_after is
  'closed_at + 90 days. Cleared on conversion. The purge deletes the founder record and clears intake and report here.';

-- Supabase grants anon and authenticated seven privileges on every new table.
-- RLS with a service_role-only policy is the defense; the revoke makes it two.
alter table dependency_reports enable row level security;

drop policy if exists "service_role_full_access" on dependency_reports;
create policy "service_role_full_access" on dependency_reports
  to service_role using (true) with check (true);

revoke all on table dependency_reports from public, anon, authenticated;

-- Confirm after paste. Paste the output of all four back.
--
--   -- 1. Columns. Expect 24.
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'dependency_reports' order by ordinal_position;
--
--   -- 2. Grants. Expect no row for anon, authenticated, or PUBLIC.
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_name = 'dependency_reports' order by grantee, privilege_type;
--
--   -- 3. RLS on, one policy, service_role only.
--   select c.relrowsecurity, p.polname, p.polroles::regrole[]
--   from pg_class c left join pg_policy p on p.polrelid = c.oid
--   where c.relname = 'dependency_reports';
--
--   -- 4. Constraints. Expect 15 rows: 11 checks, 3 foreign keys, 1 primary key.
--   select conname, contype
--   from pg_constraint
--   where conrelid = 'dependency_reports'::regclass order by contype, conname;
