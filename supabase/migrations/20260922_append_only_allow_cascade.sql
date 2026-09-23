-- Append only, without blocking the deletion of a whole Basalith.
--
-- 20260921_owner_deposits_append_only.sql refused every UPDATE and DELETE on
-- owner_deposits, including rows removed by ON DELETE CASCADE from archives.
-- That made `delete from archives where id = $1` raise, which is the statement
-- lib/trialExpiryRunner.ts (delete_archive) runs and the one the dissolution
-- runbook needs. Reproduced on Postgres 16 before this was written.
--
-- A cascaded delete runs inside the foreign key's own trigger, so
-- pg_trigger_depth() is greater than 1 there and exactly 1 for a direct
-- statement. Direct UPDATE and DELETE of a deposit are still refused.
-- Known width: a delete issued from inside any other trigger also passes. No
-- such trigger exists on owner_deposits.
--
-- Applied to production by hand in the Supabase SQL editor, September 22, 2026.
-- Proof pasted the same day: a direct delete inside begin/rollback returned
--   ERROR: P0001: Basalith records are append only: DELETE on
--   public.owner_deposits is refused. Add a correcting row instead.
--   CONTEXT: PL/pgSQL function refuse_record_mutation() line 11 at RAISE
-- Line 11 is the raise in this version (the September 21 version raised at
-- line 3), so the error came from the replaced function.
--
-- Still to prove: a cascade delete of a whole archive, on the throwaway trial
-- in the trial slice B gate.

create or replace function refuse_record_mutation()
returns trigger
language plpgsql
as $$
begin
  -- Deleting a whole Basalith (trial expiry, dissolution) removes its
  -- deposits by cascade. That is the deletion promise and it must work.
  -- A cascade arrives from inside the foreign key's own trigger, so
  -- pg_trigger_depth() > 1. A direct edit or delete of one deposit arrives
  -- at depth 1 and is still refused.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception
    'Basalith records are append only: % on %.% is refused. Add a correcting row instead.',
    tg_op, tg_table_schema, tg_table_name;
end;
$$;
