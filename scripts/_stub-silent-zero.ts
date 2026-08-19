/**
 * HARNESS SELF-TEST STUB. Not a probe. Ships nothing. Costs no model calls.
 *
 * This is the regression test for the defect that motivated slice 2.1.
 *
 * It exits 0 and writes NOTHING to either stream. That is precisely the shape
 * GATE 1b and GATE 2 presented in every stored acceptance transcript: a clean
 * exit code with no recorded output, which the old wrapper reported as PASS.
 *
 * The harness must FAIL the gate wrapping this stub, and it must fail on the
 * EVIDENCE assertion rather than on the exit code. If this stub ever passes, the
 * wrapper has regressed to trusting exit codes again and every figure the
 * verification surface publishes is unbacked.
 *
 * Do not "fix" this stub by making it print something. Its silence is the test.
 *
 * Run: npx tsx scripts/_stub-silent-zero.ts   (prints nothing, exits 0)
 */

process.exit(0)
