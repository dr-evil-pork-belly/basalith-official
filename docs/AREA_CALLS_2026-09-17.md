# Area calls: the way in from the coverage map. September 17, 2026.

The map told an owner where the archive was silent and gave them nowhere to
go. The Founding Sequence is three calls and then closes; the open capture
surfaces on the dashboard are not aimed at anything. The growth recon's rule
was that the map should govern question selection before any surface adds
volume. This is that rule, built: every thin area on the map carries a
"Deposit here" link that opens one incident interview seeded for that area.

Nothing here is a new engine. The seeds and the marker are new; the interview,
the answer route, the pair creation, and the surface are the founding ones.

## Files

New
- `lib/areaCalls.ts`: sixteen seeds (eight personal, eight business, one per
  area of each taxonomy), `startAreaCall`, `openAreaCall`, shape assertions.
- `lib/areaCalls.test.ts`: 3 tests, including that no seed repeats a coverage
  probe or a founding opener.
- `app/api/archive/area-call/start/route.ts`: POST `{ area }`, owner only, 30
  an hour per IP. Returns the open interview either way, so the page continues
  whatever is open.

Changed
- `lib/incidentSession.ts`: `areaCall?: AreaCallMarker` on `IncidentState`,
  same contract as `founding`.
- `lib/foundingSequence.ts`: `status.current.area`.
- `app/api/archive/b2b-question/answer/route.ts`: an area call closing sends
  `coverage.run.requested` under `after()`; response carries `areaCall`.
- `lib/inngest/coverageFunctions.ts`: the 24 hour idempotency key on
  `computeCoverage` is removed. It stopped a map from being read again the day
  its owner deposited into it. The in-flight check and the partial unique
  index still refuse a second run while one is open.
- `app/archive/founding/page.tsx`, `FoundingClient.tsx`: `?area=` opens a
  call on load; the header, the eyebrow, and the closing panel are area-aware;
  the founding cards hide while an area call is on screen; the page explains
  when a founding call or another area call has to finish first.
- `app/api/archive/coverage/route.ts`: returns `openArea`.
- `app/archive/components/CoverageMap.tsx`: "Deposit here" on every card that
  is not fully backed; "Continue your call" on the one that is open.
- `CLAUDE.md`: area calls paragraph; the idempotency note updated.

## The seeds

Same form as the founding openers: a real moment, not a value statement,
because the verifier grounds a position in what someone did and cannot ground
one in what they believe. A seed and a probe aim at the same kind of judgment
on purpose; the probe measures, the seed elicits, and the interview runs ten
to twenty turns past the seed, so a call is never one answer to one probe.
Read and approved by the founder before wiring.

## Preview and test

    git add -A
    git commit -m "Area calls: one interview aimed at one thin area, opened from the coverage map"
    vercel

On the preview, signed in on the Dr Ha archive:

1. Dashboard. Every area card except a fully backed one shows "Deposit here."
2. Click it on Money. /archive/founding opens with "A call on Money" and the
   Money seed as the first question. The three founding cards are not shown.
3. Answer a turn. Reload. Same probe re-serves. The eyebrow reads "Money ·
   <phase>".
4. Back on the dashboard, the Money card reads "Continue your call." Click
   another card: the page says a call on Money is already open.
5. Finish the call (ten to twenty turns). The closing panel names the area and
   the deposit count. Then:

        select id, status, state->'areaCall' as area_call,
               jsonb_array_length(state->'probeHistory') as turns
        from incident_sessions
        where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
        order by created_at desc limit 2;

        select id, trigger_source, started_at, finished_at, ok, probes_deposit
        from coverage_runs
        where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
        order by started_at desc limit 2;

   The second query proves the send fired from the lambda and, once it
   finishes, gives the new reading. Money should move off zero.
6. Dashboard again after the run: the Money card with the new count.

Then promote. No migration.

## Rollback

`vercel rollback`. An area call already opened stays in `incident_sessions`
as an open incident and is served by the founding page as an interview from
the dashboard, exactly as an open founding call would be.

## Not done

- A way to abandon an open call from the page. Today an open incident blocks
  every other call until it is finished; the founding page has always worked
  this way. If it bites, `status = 'abandoned'` on the row is the release.
- Area calls on the succession dashboard's own question flow. The business
  seeds exist and the map card links work for a succession archive; the
  succession dashboard's "Answer a question" panel is unchanged.
