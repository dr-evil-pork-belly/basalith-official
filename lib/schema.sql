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


-- ═══════════════════════════════════════════════════════
-- EMAIL LABELLING SYSTEM
-- ═══════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- EMAIL SESSIONS
-- Tracks each photograph email sent
-- ─────────────────────────────────────
create table if not exists email_sessions (
  id                    uuid        default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  archive_id            uuid        references archives(id) on delete cascade,
  photograph_id         uuid        references photographs(id),
  sent_at               timestamptz,
  reply_window_closes   timestamptz,              -- 48 hours after sent_at
  recipients            text[],                   -- array of contributor emails
  reply_count           integer     default 0,
  summary_sent          boolean     default false,
  subject_line          text,
  reply_address         text        unique         -- e.g. whitfield-abc123@reply.basalith.xyz
);

-- ─────────────────────────────────────
-- EMAIL REPLIES
-- Each reply to a photograph email
-- ─────────────────────────────────────
create table if not exists email_replies (
  id                  uuid        default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  session_id          uuid        references email_sessions(id),
  archive_id          uuid        references archives(id),
  photograph_id       uuid        references photographs(id),

  contributor_email   text        not null,
  contributor_name    text,

  raw_reply           text        not null,

  -- AI parsed fields
  people_mentioned    text[],
  year_estimate       text,
  location_mentioned  text,
  story_extracted     text,
  legacy_note         text,

  ai_parsed           boolean     default false,
  saved_to_archive    boolean     default false,
  confirmation_sent   boolean     default false
);

-- ─────────────────────────────────────
-- EMAIL PREFERENCES
-- Per-archive delivery settings
-- ─────────────────────────────────────
create table if not exists email_preferences (
  id            uuid        default gen_random_uuid() primary key,
  archive_id    uuid        references archives(id) on delete cascade unique,
  cadence       text        default 'daily',         -- daily | three_weekly | weekly | paused
  send_time     text        default '21:00',          -- HH:MM local time
  timezone      text        default 'America/New_York',
  active        boolean     default true,
  last_sent_at  timestamptz,
  next_send_at  timestamptz
);

create index if not exists idx_email_sessions_archive  on email_sessions(archive_id);
create index if not exists idx_email_replies_session   on email_replies(session_id);
create index if not exists idx_email_prefs_next_send   on email_preferences(next_send_at) where active = true;

-- Add resend_email_id for idempotent reply processing
alter table email_replies
  add column if not exists resend_email_id text unique;


-- ═══════════════════════════════════════════════════════
-- PRIMARY USER EXPERIENCE — OWNER NOTIFICATIONS & DEPOSITS
-- Run this block in Supabase SQL Editor after initial schema
-- ═══════════════════════════════════════════════════════

-- Archive score tracking columns
alter table archives
  add column if not exists archive_score               integer     default 0,
  add column if not exists score_breakdown             jsonb       default '{}',
  add column if not exists owner_name                  text,
  add column if not exists last_digest_sent_at         timestamptz,
  add column if not exists last_weekly_report_sent_at  timestamptz;

-- Primary user notifications log
create table if not exists owner_notifications (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  archive_id  uuid        references archives(id) on delete cascade,
  type        text        not null,
  -- morning_digest | contribution_alert | milestone | deposit_prompt | weekly_report
  subject     text,
  sent_to     text,
  sent_at     timestamptz,
  metadata    jsonb       default '{}'
);

-- Deposits by primary user (owner's own memories)
create table if not exists owner_deposits (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  archive_id      uuid        references archives(id) on delete cascade,
  prompt          text,
  response        text        not null,
  photograph_id   uuid        references photographs(id),
  essence_status  text        default 'pending'
  -- pending | fed | excluded
);

create index if not exists idx_owner_notifications_archive on owner_notifications(archive_id);
create index if not exists idx_owner_deposits_archive      on owner_deposits(archive_id);


-- ═══════════════════════════════════════════════════════
-- ENTITY CONVERSATIONS & ACCURACY TRACKING
-- ═══════════════════════════════════════════════════════

-- Entity conversation history
create table if not exists entity_conversations (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  archive_id      uuid        references archives(id) on delete cascade,
  session_id      uuid        default gen_random_uuid(),
  -- groups messages in one sitting
  role            text        not null,
  -- user | entity
  content         text        not null,
  accuracy_rating text,
  -- accurate | partial | inaccurate — null until user rates it
  correction      text
  -- user's correction if inaccurate
);

-- Entity accuracy tracking by dimension
create table if not exists entity_accuracy (
  id              uuid        default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  archive_id      uuid        references archives(id) on delete cascade,
  dimension       text        not null,
  -- professional_philosophy | relationship_to_family | core_values |
  -- spiritual_beliefs | fears_and_vulnerabilities | early_life |
  -- approach_to_money | approach_to_people | defining_experiences | wisdom_and_lessons
  accuracy_score  float       default 0.0,
  -- 0.0 to 1.0
  deposit_count   integer     default 0,
  label_count     integer     default 0,
  last_updated    timestamptz default now()
);

create index if not exists idx_entity_conversations_archive on entity_conversations(archive_id);
create index if not exists idx_entity_conversations_session on entity_conversations(session_id);
create index if not exists idx_entity_accuracy_archive      on entity_accuracy(archive_id);


-- ═══════════════════════════════════════════════════════
-- WISDOM EXTRACTION SESSIONS
-- Monthly structured sessions targeting lowest-scoring dimension
-- ═══════════════════════════════════════════════════════

create table if not exists wisdom_sessions (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  archive_id       uuid        references archives(id) on delete cascade,
  dimension        text        not null,
  -- matches DIMENSIONS ids: professional_philosophy | relationship_to_family | etc.
  status           text        default 'in_progress',
  -- in_progress | completed | skipped
  current_question integer     default 0,
  -- 0-4 (index of current question)
  completed_at     timestamptz,
  answers          jsonb       default '[]'
  -- array of { questionId, question, answer, savedAt }
);

create index if not exists idx_wisdom_sessions_archive   on wisdom_sessions(archive_id);
create index if not exists idx_wisdom_sessions_dimension on wisdom_sessions(archive_id, dimension);


-- ═══════════════════════════════════════════════════════
-- WITNESS SESSIONS
-- Structured guided sessions for family / friends
-- ═══════════════════════════════════════════════════════

create table if not exists witness_sessions (
  id                  uuid        default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  archive_id          uuid        references archives(id) on delete cascade,
  contributor_email   text        not null,
  contributor_name    text,
  relationship        text        not null,
  -- child | spouse | colleague | childhood_friend | sibling
  subject_name        text        not null,
  -- first name or how the contributor knows the subject, e.g. "David" or "Dad"
  status              text        default 'in_progress',
  -- in_progress | completed | abandoned
  current_question    integer     default 0,
  completed_at        timestamptz,
  answers             jsonb       default '[]'
  -- { questionId, question, answer, savedAt }[]
);

create table if not exists witness_deposits (
  id                  uuid        default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  archive_id          uuid        references archives(id) on delete cascade,
  witness_session_id  uuid        references witness_sessions(id),
  contributor_email   text        not null,
  contributor_name    text,
  relationship        text        not null,
  question_id         text        not null,
  question_text       text        not null,
  answer              text        not null,
  what_it_captures    text,
  essence_status      text        default 'pending'
  -- pending | fed | excluded
);

create index if not exists idx_witness_sessions_archive  on witness_sessions(archive_id);
create index if not exists idx_witness_deposits_archive  on witness_deposits(archive_id);
create index if not exists idx_witness_deposits_session  on witness_deposits(witness_session_id);


-- ═══════════════════════════════════════════════════════
-- SIGNIFICANT DATES
-- Life events that trigger curated photograph + memory sends
-- ═══════════════════════════════════════════════════════

create table if not exists significant_dates (
  id           uuid        default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  archive_id   uuid        references archives(id) on delete cascade,
  person_name  text        not null,
  -- e.g. "Harold", "Mom", "Grandma Rose"
  date_type    text        not null,
  -- birthday | death_anniversary | wedding_anniversary | other
  month        integer     not null check (month between 1 and 12),
  day          integer     not null check (day between 1 and 31),
  year         integer,
  -- optional — birth year / death year etc. Used to calculate "would have turned X"
  active       boolean     default true,
  notes        text
  -- optional personal note shown in the email send
);

create index if not exists idx_significant_dates_archive on significant_dates(archive_id);
create index if not exists idx_significant_dates_month_day on significant_dates(month, day);
