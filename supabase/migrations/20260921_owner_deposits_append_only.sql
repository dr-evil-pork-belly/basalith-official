-- Immutability of the record, enforced where the copy says it is.
-- September 21, 2026.
--
-- WHY THIS EXISTS. /integrity and /pricing both claimed the record was "frozen
-- at the database level." Nothing in this database refused a write to anything:
-- a search of all 53 migrations and the schema for BEFORE UPDATE, BEFORE DELETE,
-- CREATE RULE, FOR UPDATE USING and RAISE EXCEPTION returned nothing. The claim
-- named an enforcement layer that held no enforcement.
--
-- WHY IT IS SAFE. It changes no behavior. As of today the codebase holds 7
-- inserts and 15 selects against owner_deposits and no update or delete of any
-- kind, from any route, admin tool or portal surface. This trigger forbids an
-- operation the product never performs. It converts a property of the current
-- code into a guarantee that a future route cannot quietly revoke.
--
-- WHY DEPOSITS AND NOT EVERYTHING. A deposit is what the owner actually said,
-- which is what the promise is about. training_pairs are derived from deposits
-- and regenerating them is legitimate, so a blanket refusal there would block
-- the pipeline rather than protect the owner. If that ever changes, add the
-- trigger to that table too rather than loosening this one.
--
-- CORRECTIONS ARE ADDITIVE. A deposit that turns out to be wrong is answered by
-- a later deposit, never by an edit. That is the same rule the archive already
-- applies to a successor's context: add, never overwrite.

create or replace function refuse_record_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Basalith records are append only: % on %.% is refused. Add a correcting row instead.',
    tg_op, tg_table_schema, tg_table_name;
end;
$$;

comment on function refuse_record_mutation() is
  'Refuses UPDATE and DELETE so the append-only claim on /integrity is enforced in the database rather than by the absence of a feature. See docs/IMMUTABILITY_VAULT_2026-09-21.md.';

drop trigger if exists owner_deposits_append_only on owner_deposits;

create trigger owner_deposits_append_only
  before update or delete on owner_deposits
  for each row execute function refuse_record_mutation();

-- PROVE IT. Run this after the migration. It is the whole point: a guarantee
-- nobody has watched fail is not yet a guarantee.
--
--   -- expect: ERROR, Basalith records are append only: UPDATE on public.owner_deposits
--   update owner_deposits set content = content
--   where id = (select id from owner_deposits limit 1);
--
--   -- expect: ERROR, Basalith records are append only: DELETE on public.owner_deposits
--   delete from owner_deposits
--   where id = (select id from owner_deposits limit 1);
--
--   -- expect: the trigger, listed
--   select tgname, tgenabled from pg_trigger
--   where tgrelid = 'owner_deposits'::regclass and not tgisinternal;
