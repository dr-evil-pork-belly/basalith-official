/**
 * HARNESS SELF-TEST STUB. Not a probe. Ships nothing. Costs no model calls.
 *
 * The opposite failure from _stub-silent-zero.ts. This one produces real output
 * on BOTH streams and then exits non-zero.
 *
 * Two things it proves, and the second is the one that is easy to lose:
 *
 *   1. The harness fails a gate on a non-zero exit code.
 *   2. The capture file still holds the child's output even though the run
 *      failed. A harness that only records evidence on success is useless
 *      exactly when evidence matters most, which is when something broke.
 *
 * STDERR IS DELIBERATE. scripts/two-layer-probe.ts writes its progress counter
 * with console.error (two-layer-probe.ts:205), so a capture construct that
 * silently drops stderr would lose real probe output while looking correct on
 * the stdout-only probes. This stub is what keeps that honest.
 *
 * Run: npx tsx scripts/_stub-loud-fail.ts   (prints two lines, exits 1)
 */

console.log('STUB-SENTINEL-STDOUT loud fail stub reached its stdout line')
console.error('STUB-SENTINEL-STDERR loud fail stub reached its stderr line')

process.exit(1)
