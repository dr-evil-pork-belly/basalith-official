-- "You told me this" — one resurfacing per archive per UTC day.
-- Pure retrieval: a row points at one owner-authored owner_deposits row and
-- records the time-frame band it was shown under. No generated content here.
create table if not exists deposit_resurfacings (
  id          uuid primary key default gen_random_uuid(),
  archive_id  uuid not null references archives(id) on delete cascade,
  deposit_id  uuid not null references owner_deposits(id) on delete cascade,
  shown_on    date not null default (now() at time zone 'utc')::date,
  frame_key   text not null,
  reaction    text,
  reacted_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- One resurfacing per archive per day. The endpoint relies on this for
-- ON CONFLICT (archive_id, shown_on) DO NOTHING so concurrent dashboard
-- loads converge on a single deposit and a single row.
create unique index if not exists deposit_resurfacings_archive_day
  on deposit_resurfacings (archive_id, shown_on);
create index if not exists deposit_resurfacings_deposit
  on deposit_resurfacings (deposit_id, shown_on desc);

-- RLS: writes are service-role only (convention from 20260502_training_pipeline.sql).
alter table deposit_resurfacings enable row level security;
create policy "service_role_full_access" on deposit_resurfacings
  to service_role using (true) with check (true);
