-- ═══════════════════════════════════════════════════════
-- BASALITH ARCHIVE — DATABASE SCHEMA
-- Run this in Supabase SQL Editor: Project → SQL Editor → New query
-- ═══════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- ARCHIVES
-- One per family/client
-- ─────────────────────────────────────
create table if not exists archives (
  id                uuid    default gen_random_uuid() primary key,
  created_at        timestamptz default now(),
  name              text    not null,              -- e.g. "The Whitfield Archive"
  family_name       text    not null,
  established       timestamptz default now(),
  generation        text    default 'Generation I',
  status            text    default 'active',      -- active | suspended | transitioning
  owner_email       text    not null,
  tier              text    default 'estate',      -- archive | estate | dynasty
  total_photos      integer default 0,
  labelled_photos   integer default 0,
  current_streak    integer default 0,
  longest_streak    integer default 0,
  last_label_date   date,
  depth_score       integer default 0              -- 0-100 overall completeness score
);

-- ─────────────────────────────────────
-- PHOTOGRAPHS
-- One row per uploaded photograph
-- ─────────────────────────────────────
create table if not exists photographs (
  id                        uuid    default gen_random_uuid() primary key,
  created_at                timestamptz default now(),
  archive_id                uuid    references archives(id) on delete cascade,
  storage_path              text,                  -- path in Supabase Storage bucket (nullable: label without photo)
  thumbnail_path            text,
  original_name             text,
  file_size                 integer,               -- bytes
  width                     integer,
  height                    integer,
  status                    text    default 'unlabelled',
  -- unlabelled | labelled | needs_review | archived | discarded

  -- AI processing fields
  ai_processed              boolean default false,
  ai_filter_score           float,                 -- 0-1, confidence it belongs in archive
  ai_category               text,                  -- family_moment | event | portrait | travel | document | noise
  ai_era_estimate           text,                  -- e.g. "1970s" or "1962-1965"
  ai_quality_score          float,                 -- 0-1 archive value score
  ai_duplicate_cluster_id   uuid,                  -- groups near-identical photos
  is_best_in_cluster        boolean default true,

  -- Queue management
  priority_score            float   default 0.5,   -- higher = shown first in labelling queue
  queue_position            integer
);

-- ─────────────────────────────────────
-- LABELS
-- The story data for each photograph
-- ─────────────────────────────────────
create table if not exists labels (
  id                    uuid    default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  photograph_id         uuid    references photographs(id) on delete cascade,
  archive_id            uuid    references archives(id) on delete cascade,
  labelled_by           text    not null,           -- contributor email or name

  -- Core label fields
  what_was_happening    text,                       -- The main story field
  legacy_note           text,                       -- What great-grandchildren should know
  year_taken            integer,
  season_taken          text,                       -- spring | summer | fall | winter | unknown
  location              text,

  -- People in the photograph
  people_tagged         text[],                     -- array of names/relationships

  -- Contributor invitation
  invited_contributor   text,                       -- email of person invited to add context

  -- Metadata
  is_primary_label      boolean default true,       -- false for contributor additions
  essence_feed_status   text    default 'pending'   -- pending | fed | excluded
);

-- ─────────────────────────────────────
-- PEOPLE
-- Face registry for the archive
-- ─────────────────────────────────────
create table if not exists people (
  id                    uuid    default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  archive_id            uuid    references archives(id) on delete cascade,
  name                  text    not null,
  relationship          text,                       -- e.g. "Grandfather", "Harold's colleague"
  birth_year            integer,
  death_year            integer,
  face_vector           text,                       -- JSON string of face embedding for matching
  photo_count           integer default 0,          -- how many photos they appear in
  is_archive_subject    boolean default false        -- true if this is the primary person
);

-- ─────────────────────────────────────
-- CONTRIBUTORS
-- Family members with archive access
-- ─────────────────────────────────────
create table if not exists contributors (
  id                uuid    default gen_random_uuid() primary key,
  created_at        timestamptz default now(),
  archive_id        uuid    references archives(id) on delete cascade,
  email             text    not null,
  name              text,
  role              text    default 'contributor',  -- owner | contributor | viewer
  status            text    default 'pending',      -- pending | active | removed
  photos_labelled   integer default 0,
  last_active       timestamptz,
  invited_by        text
);

-- ─────────────────────────────────────
-- MILESTONES
-- Track which milestones have been shown
-- ─────────────────────────────────────
create table if not exists milestones (
  id                uuid    default gen_random_uuid() primary key,
  created_at        timestamptz default now(),
  archive_id        uuid    references archives(id) on delete cascade,
  milestone_count   integer not null,               -- 1, 5, 10, 25, 50, 100 etc
  reached_at        timestamptz default now(),
  shown             boolean default false
);

-- ─────────────────────────────────────
-- DECADE COVERAGE
-- Pre-computed decade stats per archive
-- ─────────────────────────────────────
create table if not exists decade_coverage (
  id              uuid    default gen_random_uuid() primary key,
  archive_id      uuid    references archives(id) on delete cascade,
  decade          text    not null,                 -- "1960s", "1970s" etc
  photo_count     integer default 0,
  labelled_count  integer default 0,
  unique(archive_id, decade)
);

-- ─────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────
create index if not exists idx_photographs_archive  on photographs(archive_id);
create index if not exists idx_photographs_status   on photographs(status);
create index if not exists idx_photographs_priority on photographs(archive_id, priority_score desc);
create index if not exists idx_labels_photograph    on labels(photograph_id);
create index if not exists idx_labels_archive       on labels(archive_id);
create index if not exists idx_people_archive       on people(archive_id);
create index if not exists idx_contributors_archive on contributors(archive_id);
create index if not exists idx_decade_archive       on decade_coverage(archive_id);



-- ═══════════════════════════════════════════════════════
-- ARCHIVIST PORTAL — DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- ARCHIVISTS
-- One row per sales archivist
-- ─────────────────────────────────────
create table if not exists archivists (
  id                    uuid    default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  name                  text    not null,
  email                 text    not null unique,
  phone                 text,
  status                text    default 'active',                -- active | suspended | provisional
  rank                  text    default 'Provisional Archivist', -- Provisional | Active | Senior | Master | Sovereign
  total_closings        integer default 0,
  this_month_closings   integer default 0,
  sprint_closings       integer default 0,                       -- resets monthly
  residual_income_cents integer default 0,                       -- annual residual in cents
  last_active           timestamptz
);

-- ─────────────────────────────────────
-- PROSPECTS
-- CRM rows per archivist
-- ─────────────────────────────────────
create table if not exists prospects (
  id              uuid    default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  archivist_id    uuid    references archivists(id) on delete cascade,
  name            text    not null,
  contact         text,
  status          text    default 'New',  -- New | Contacted | Demo | Proposal | Closed | Lost
  tier            text    default '',     -- Archive | Estate | Dynasty | ''
  last_contact    date,
  next_action     text,
  notes           text,
  closed_at       timestamptz
);

-- ─────────────────────────────────────
-- COMMISSIONS
-- Earning history per archivist
-- ─────────────────────────────────────
create table if not exists commissions (
  id              uuid    default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  archivist_id    uuid    references archivists(id) on delete cascade,
  prospect_id     uuid    references prospects(id) on delete set null,
  type            text    not null,              -- founding | residual | sprint | override
  amount_cents    integer not null,
  status          text    default 'pending',     -- pending | paid
  description     text,
  paid_at         timestamptz
);

-- ─────────────────────────────────────
-- LEADERBOARD VIEW
-- Ordered by this_month_closings desc
-- ─────────────────────────────────────
create or replace view archivist_leaderboard as
  select
    a.id,
    a.name,
    a.rank,
    a.total_closings,
    a.this_month_closings,
    a.sprint_closings,
    a.residual_income_cents,
    coalesce(
      (select p.tier from prospects p
       where p.archivist_id = a.id and p.status = 'Closed' and p.tier != ''
       order by
         case p.tier when 'Dynasty' then 3 when 'Estate' then 2 when 'Archive' then 1 else 0 end desc
       limit 1),
      'Archive'
    ) as top_tier
  from archivists a
  where a.status = 'active'
  order by a.this_month_closings desc, a.total_closings desc;

-- ─────────────────────────────────────
-- INDEXES for archivist tables
-- ─────────────────────────────────────
create index if not exists idx_prospects_archivist  on prospects(archivist_id);
create index if not exists idx_prospects_status     on prospects(archivist_id, status);
create index if not exists idx_commissions_archivist on commissions(archivist_id);
create index if not exists idx_commissions_status   on commissions(archivist_id, status);


-- ═══════════════════════════════════════════════════════
-- STORAGE SETUP (manual steps in Supabase Dashboard)
-- ═══════════════════════════════════════════════════════
--
-- 1. Go to Storage → New bucket
-- 2. Name: "photographs"
-- 3. Public: NO (private bucket)
-- 4. File size limit: 50MB
-- 5. Allowed MIME types:
--    image/jpeg, image/png, image/webp, image/heic, image/tiff
--
-- 6. Go to Storage → Policies → photographs bucket
-- 7. Add INSERT policy: allow authenticated users to upload
--    (path prefix should match archive_id folder)
-- 8. Add SELECT policy: allow authenticated users to read
--    files in their archive folder
--
-- NOTE: The archive portal uses cookie-based auth (not Supabase Auth),
-- so server-side uploads use the service role key (full access).
-- The Storage policies above apply to future direct-browser uploads.
-- ═══════════════════════════════════════════════════════
