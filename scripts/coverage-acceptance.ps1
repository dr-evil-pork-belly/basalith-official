# Coverage map acceptance run. PowerShell, from the repo root.
#
#   .\scripts\coverage-acceptance.ps1
#   .\scripts\coverage-acceptance.ps1 -ArchiveId a38e4503-c7d2-4af3-af8c-cacd66974e0b
#   .\scripts\coverage-acceptance.ps1 -SkipDrive
#   .\scripts\coverage-acceptance.ps1 -SkipRegression   # prompt unchanged only
#
# Runs the three gates in order and stops at the first failure, because a later
# gate cannot be interpreted if an earlier one failed. Everything is teed to a
# transcript file so the whole thing can be pasted back as the acceptance
# evidence rather than summarized from memory.
#
# GATE 1  unit tests. Pure. Free. Instant.
# GATE 1b shared-prompt regression. REQUIRED whenever lib/entitySystemPrompt.ts
#         changes, because two-layer-probe.ts and demo-refusal-probe.ts are the
#         gates for the two surfaces that import it: the production successor
#         route and the public /succession/demo. They are scripts, not *.test.ts,
#         so `npm test` does NOT collect them. That was stated wrongly twice and
#         is why this gate now exists in the harness instead of in someone's
#         memory. Roughly 10 minutes of model calls.
# GATE 2  fixture probe. Fictional personas, known ground truth, writes nothing.
#         Two model calls per probe, run twice per persona. At probe set v2 that
#         is 192 calls per persona. Budget 20 to 30 minutes.
# GATE 3  live drive against a real archive. WRITES REAL ROWS to coverage_runs,
#         coverage_probe_results, and archive_coverage. 96 calls at v2, about
#         six minutes.
#
# Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# and ANTHROPIC_API_KEY. Gate 3 additionally requires the migration to have been
# pasted already; it will fail on a missing table if it has not.

param(
  [string] $ArchiveId = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b',
  [switch] $SkipDrive,
  # Only pass this when lib/entitySystemPrompt.ts is unchanged since the last
  # green regression run. It is never valid before a deploy that ships a prompt
  # change.
  [switch] $SkipRegression
)

$ErrorActionPreference = 'Continue'

$stamp      = Get-Date -Format 'yyyyMMdd-HHmmss'
$transcript = Join-Path (Get-Location) "coverage-acceptance-$stamp.txt"

Start-Transcript -Path $transcript | Out-Null

function Write-Gate([string] $text) {
  Write-Host ''
  Write-Host ('=' * 84)
  Write-Host $text
  Write-Host ('=' * 84)
}

function Stop-Here([string] $gate) {
  Write-Host ''
  Write-Host "FAILED at $gate. Stopping."
  Write-Host "Transcript: $transcript"
  Stop-Transcript | Out-Null
  exit 1
}

Write-Gate "COVERAGE MAP ACCEPTANCE  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "repo        $(Get-Location)"
Write-Host "archive     $ArchiveId"
Write-Host "transcript  $transcript"

if (-not (Test-Path '.env.local')) {
  Write-Host ''
  Write-Host 'ERROR: .env.local not found. Run this from the repo root.'
  Stop-Here 'setup'
}

# ── GATE 1 ────────────────────────────────────────────────────────────────────
Write-Gate 'GATE 1  unit tests (npm test)'
npm test
if ($LASTEXITCODE -ne 0) { Stop-Here 'GATE 1 unit tests' }
Write-Host ''
Write-Host 'GATE 1 PASS'

# ── GATE 1b ───────────────────────────────────────────────────────────────────
if ($SkipRegression) {
  Write-Gate 'GATE 1b  SKIPPED (-SkipRegression). Only valid if the prompt is unchanged.'
} else {
  Write-Gate 'GATE 1b  shared-prompt regression (two-layer + demo refusal)'
  Write-Host 'These guard the production successor route and the public demo, both of'
  Write-Host 'which import lib/entitySystemPrompt.ts. Roughly 10 minutes.'
  Write-Host ''

  Write-Host '--- scripts/two-layer-probe.ts (security contract) ---'
  npx tsx scripts/two-layer-probe.ts
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'The two-layer security contract regressed. Do NOT deploy.'
    Stop-Here 'GATE 1b two-layer-probe'
  }

  Write-Host ''
  Write-Host '--- scripts/demo-refusal-probe.ts (the sales demo refusal beat) ---'
  npx tsx scripts/demo-refusal-probe.ts
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'The demo refusal beat regressed. Do NOT deploy: /succession/demo is'
    Write-Host 'public and is the asset prospects are shown. Read which part failed.'
    Write-Host 'A covered control that stopped landing on deposit means the prompt was'
    Write-Host 'over-corrected and the entity now declines things the archive backs.'
    Stop-Here 'GATE 1b demo-refusal-probe'
  }

  Write-Host ''
  Write-Host 'GATE 1b PASS'
}

# ── GATE 2 ────────────────────────────────────────────────────────────────────
Write-Gate 'GATE 2  fixture probe (fictional personas, nothing written)'
Write-Host 'Two runs per persona so domain stability can be gated. Budget 20 to 30 minutes.'
Write-Host ''
npx tsx scripts/coverage-fixture-probe.ts
$fixtureExit = $LASTEXITCODE

# Exit code 2 is the harness failing, not a gate failing. The distinction is
# load bearing: an earlier version printed "the map failed to discriminate" when
# the real cause was a DNS lookup failing partway through, which is a conclusion
# the run had not established.
if ($fixtureExit -eq 2) {
  Write-Host ''
  Write-Host 'The fixture probe did not finish, so the map was NOT judged.'
  Write-Host 'It is unmeasured, not wrong. Re-run when the network is healthy.'
  Stop-Here 'GATE 2 harness failure (not a gate result)'
}
if ($fixtureExit -ne 0) {
  Write-Host ''
  Write-Host 'The map failed to discriminate on a fixture whose ground truth is known.'
  Write-Host 'Do NOT run gate 3. A map that cannot be trusted on Margaret cannot be'
  Write-Host 'read on a real archive, because nobody knows the right answer there.'
  Stop-Here 'GATE 2 fixture probe'
}
Write-Host ''
Write-Host 'GATE 2 PASS'
Write-Host 'Domain drift is now gated, not just reported. Probe-level drift is still'
Write-Host 'printed and is expected; it only matters when it moves a domain.'

# ── GATE 3 ────────────────────────────────────────────────────────────────────
if ($SkipDrive) {
  Write-Gate 'GATE 3  SKIPPED (-SkipDrive)'
} else {
  Write-Gate 'GATE 3  live drive (WRITES REAL ROWS)'
  Write-Host "archive $ArchiveId"
  Write-Host 'Requires BOTH coverage migrations to have been pasted into Supabase:'
  Write-Host '  20260815_coverage_map.sql then 20260816_coverage_overreach.sql'
  Write-Host ''
  npx tsx scripts/coverage-drive.ts $ArchiveId
  if ($LASTEXITCODE -ne 0) { Stop-Here 'GATE 3 live drive' }
  Write-Host ''
  Write-Host 'GATE 3 PASS'
}

Write-Gate 'ALL GATES PASS'
Write-Host 'Read the open-domain replies printed by gate 3 before trusting the map.'
Write-Host 'A domain reading open is a claim about the archive. If a reply there takes'
Write-Host 'a clear position that a real deposit backs, the probe is wrong, not the'
Write-Host 'archive.'
Write-Host ''
Write-Host "Transcript: $transcript"

Stop-Transcript | Out-Null
