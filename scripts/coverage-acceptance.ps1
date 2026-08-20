# Coverage map acceptance run. PowerShell, from the repo root.
#
#   .\scripts\coverage-acceptance.ps1
#   .\scripts\coverage-acceptance.ps1 -ArchiveId a38e4503-c7d2-4af3-af8c-cacd66974e0b
#   .\scripts\coverage-acceptance.ps1 -SkipDrive
#   .\scripts\coverage-acceptance.ps1 -SkipRegression   # prompt unchanged only
#   .\scripts\coverage-acceptance.ps1 -SelfTest         # harness self-test, zero model calls
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
#
# ==============================================================================
# EVIDENCE CAPTURE, added 2026-08-19 (slice 2.1). READ THIS BEFORE EDITING.
# ==============================================================================
#
# THE DEFECT THIS FIXES. Start-Transcript in PowerShell 5.1 does not capture
# stdout from `npx tsx` child processes. Every stored acceptance transcript shows
# GATE 1b and GATE 2 printing PASS with ZERO recorded output between the gate
# headers. The wrapper was asserting on $LASTEXITCODE alone, so a gate that
# produced nothing at all reported green.
#
# That is the same defect class the fixture probe's own header at
# scripts/coverage-fixture-probe.ts:11-27 was written to prevent, reappearing one
# layer up. A check that reports a conclusion it did not reach.
#
# THE FIX, three parts.
#
#   1. Every child process is invoked through Invoke-Gate, which streams the
#      child's combined stdout and stderr through Write-Host (so the operator
#      still watches the run live, and so Start-Transcript records it too) while
#      buffering the same lines to a per-gate file under .probe-out/.
#
#   2. A gate passes only when ALL THREE hold: the child exited zero, the capture
#      file is non-trivially sized, and the capture file contains that probe's own
#      terminal output line. Exit zero with failed evidence is the loudest failure
#      this harness can report, because it is the exact bug being fixed.
#
#   3. The run header stamps the commit sha, the branch, and whether the working
#      tree is dirty. coverage-acceptance-20260816-185446.txt ran 18:54:46 to
#      19:18:12 and cd4fc47 was committed at 19:24:33, so that transcript
#      describes code committed after it finished and nothing in the file says so.
#
# WHY 2>&1 AND NOT Tee-Object. Two reasons, both verified empirically rather than
# assumed. First, a native command's stderr under 2>&1 arrives as ErrorRecord
# objects, and letting those reach the formatter decorates every progress line
# with "At line:1 char:1 / CategoryInfo / FullyQualifiedErrorId". The ForEach-Object
# converts each to its plain message first. Second, Tee-Object -FilePath writes
# UTF-8 with a BOM in 5.1; WriteAllLines with UTF8Encoding($false) does not.
#
# stderr capture is NOT optional. scripts/two-layer-probe.ts writes its progress
# counter with console.error (two-layer-probe.ts:205), so a construct that dropped
# stderr would lose real probe output while still looking correct.
#
# DO NOT SET $ErrorActionPreference TO SilentlyContinue AROUND THE NATIVE CALL.
# It looks like the obvious tidy-up, because with EAP=Continue the transcript
# shows each stderr line twice: once decorated by PowerShell's error formatter
# ("node.exe : ... CategoryInfo ... RemoteException") and once clean from
# Write-Host. The decoration is ugly and it reads like a failure when it is only
# a progress counter.
#
# Measured on this host rather than reasoned about: SilentlyContinue does not
# suppress the decoration, it DELETES THE LINE. Against
# `node -e "stdout OUT-J; stderr ERR-J; exit 7"` the buffer came back with one
# line, OUT-J, and ERR-J was gone entirely. The exit code still read 7, so the
# gate would still have passed while having silently discarded every stderr line
# the probe wrote.
#
# That trade is unacceptable here. A duplicated line in the transcript costs an
# operator a moment of confusion. A dropped line costs the evidence. The capture
# file under .probe-out/ is the artifact that gets pasted and it is clean either
# way, because the ForEach-Object stringifies before the formatter is involved.
# Leave EAP on Continue and leave the decoration alone.
#
# $LASTEXITCODE SURVIVES THE PIPELINE. Verified on this host, PowerShell
# 5.1.26100.8875, against `node -e ... process.exit(7)`: bare call, piped to
# ForEach-Object, and piped with 2>&1 through the buffering ForEach-Object all
# returned 7, and the silent exit-0 case returned 0 with zero lines captured. Do
# not take that on faith if you change the construct. Re-run the check.
#
# THE SELF-TEST IS PERMANENT. -SelfTest runs two stub scripts that cost nothing
# and prove both failure paths: _stub-silent-zero.ts (exit 0, no output, must fail
# on evidence) and _stub-loud-fail.ts (output on both streams, exit 1, must fail
# on exit code with its evidence intact). If someone weakens the evidence
# assertion, the silent stub starts passing and the self-test says so. Do not
# delete the stubs and do not make the silent one print anything.

param(
  [string] $ArchiveId = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b',
  [switch] $SkipDrive,
  # Only pass this when lib/entitySystemPrompt.ts is unchanged since the last
  # green regression run. It is never valid before a deploy that ships a prompt
  # change.
  [switch] $SkipRegression,
  # Harness self-test. Runs the two stubs, asserts each fails for the RIGHT
  # reason, and exits. Spends no model calls and touches no gate.
  [switch] $SelfTest,
  # Run GATE 1b alone and stop. Added 2026-08-19 because there was previously no
  # way to exercise the two read-only prompt gates without also spending GATE 2's
  # 384 model calls on the fixture probe. The two gates are independent, GATE 1b
  # is the one that guards a public surface, and it costs about a tenth as much.
  # This is the flag to use when lib/entitySystemPrompt.ts changed and nothing
  # touched the coverage map.
  [switch] $OnlyRegression
)

$ErrorActionPreference = 'Continue'

$stamp      = Get-Date -Format 'yyyyMMdd-HHmmss'
$probeOut   = Join-Path (Get-Location) '.probe-out'

# .probe-out/ is gitignored at .gitignore:29. Capture files are evidence for
# pasting, not source, and must never enter the tree.
if (-not (Test-Path $probeOut)) { New-Item -ItemType Directory -Path $probeOut | Out-Null }

$transcript = Join-Path $probeOut "coverage-acceptance-$stamp.txt"

# Floor for "non-trivially sized". A gate that produced nothing writes a zero byte
# file; the loud-fail stub writes about 110 bytes; a real probe writes kilobytes.
# 64 is set below the smallest legitimate producer so that a size failure always
# means "produced nothing" rather than "produced a little", which keeps the size
# check and the sentinel check reporting independent facts.
$MIN_CAPTURE_BYTES = 64

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

# ── Provenance ────────────────────────────────────────────────────────────────
# The verification surface publishes commit_sha alongside every figure. The
# harness that produces those figures records the same thing, so a pasted
# transcript can always be tied back to the code that produced it.
function Get-Provenance {
  $sha    = (git rev-parse HEAD              2>$null | Select-Object -First 1)
  $short  = (git rev-parse --short HEAD      2>$null | Select-Object -First 1)
  $branch = (git rev-parse --abbrev-ref HEAD 2>$null | Select-Object -First 1)
  $porc   = @(git status --porcelain 2>$null)

  if (-not $sha) {
    return [pscustomobject]@{
      Sha = 'UNKNOWN'; Short = 'UNKNOWN'; Branch = 'UNKNOWN'
      Dirty = $true; DirtyText = 'UNKNOWN (git did not answer)'; DirtyPaths = @()
    }
  }

  $dirty = ($porc.Count -gt 0)
  $text  = 'clean'
  if ($dirty) { $text = "DIRTY, $($porc.Count) path(s) not committed" }

  return [pscustomobject]@{
    Sha = $sha; Short = $short; Branch = $branch
    Dirty = $dirty; DirtyText = $text; DirtyPaths = $porc
  }
}

# ── The gate runner ───────────────────────────────────────────────────────────
#
# Invokes one child script, captures its combined output to .probe-out/, and
# judges the result on three independent facts rather than on the exit code
# alone. Returns a result object; it never exits on its own, so the caller
# decides what a failure means.
function Invoke-Gate {
  param(
    [Parameter(Mandatory=$true)] [string]   $Name,             # capture file stem
    [Parameter(Mandatory=$true)] [string]   $Script,           # path to the .ts
    [Parameter(Mandatory=$true)] [string]   $Sentinel,         # regex, anchored
    [Parameter(Mandatory=$true)] [string]   $SentinelSource,   # file:line it came from
                                 [string[]] $ScriptArgs = @()
  )

  $capture = Join-Path $probeOut "$Name-$stamp.txt"

  Write-Host "  script    $Script"
  Write-Host "  capture   $capture"
  Write-Host "  sentinel  /$Sentinel/   from $SentinelSource"
  Write-Host ''

  $buffer = New-Object System.Collections.ArrayList

  # Construct verified on this host. See the header note. 2>&1 folds stderr into
  # the pipeline; the ErrorRecord is converted to its plain message before it can
  # reach the formatter; Write-Host keeps the operator watching and puts the same
  # lines into the transcript; $LASTEXITCODE survives all of it.
  if ($ScriptArgs.Count -gt 0) {
    npx tsx $Script @ScriptArgs 2>&1 | ForEach-Object {
      $line = $_
      if ($_ -is [System.Management.Automation.ErrorRecord]) { $line = $_.ToString() }
      else { $line = [string]$_ }
      [void]$buffer.Add($line)
      Write-Host $line
    }
  } else {
    npx tsx $Script 2>&1 | ForEach-Object {
      $line = $_
      if ($_ -is [System.Management.Automation.ErrorRecord]) { $line = $_.ToString() }
      else { $line = [string]$_ }
      [void]$buffer.Add($line)
      Write-Host $line
    }
  }
  $code = $LASTEXITCODE

  # Always write the file, including when nothing was captured. A missing file and
  # an empty file are different diagnoses and the harness should be able to say
  # which one happened.
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($capture, [string[]]$buffer.ToArray(), $utf8NoBom)

  $exists = Test-Path $capture
  $bytes  = 0
  if ($exists) { $bytes = (Get-Item $capture).Length }

  $sentinelFound = $false
  if ($exists -and $bytes -gt 0) {
    $hit = Select-String -Path $capture -Pattern $Sentinel -ErrorAction SilentlyContinue
    if ($hit) { $sentinelFound = $true }
  }

  $exitOk     = ($code -eq 0)
  $sizeOk     = ($exists -and $bytes -ge $MIN_CAPTURE_BYTES)
  $evidenceOk = ($sizeOk -and $sentinelFound)

  $reasons = New-Object System.Collections.ArrayList
  if (-not $exitOk)        { [void]$reasons.Add("exit code $code") }
  if (-not $exists)        { [void]$reasons.Add('capture file was not written') }
  elseif (-not $sizeOk)    { [void]$reasons.Add("capture is $bytes byte(s), floor is $MIN_CAPTURE_BYTES") }
  if (-not $sentinelFound) { [void]$reasons.Add("sentinel /$Sentinel/ not found in capture") }

  Write-Host ''
  Write-Host '  ---- evidence ----------------------------------------------------------'
  Write-Host ("  exit code        {0}   {1}" -f $code,  $(if ($exitOk)        { 'ok' } else { 'FAIL' }))
  Write-Host ("  capture bytes    {0}   {1}" -f $bytes, $(if ($sizeOk)        { 'ok' } else { 'FAIL' }))
  Write-Host ("  sentinel found   {0}   {1}" -f $sentinelFound, $(if ($sentinelFound) { 'ok' } else { 'FAIL' }))
  Write-Host ("  lines captured   {0}" -f $buffer.Count)

  # The headline case. Exit zero with no evidence is the original defect and it
  # gets said in full every time, because the whole point is that it must never
  # again be mistaken for a pass.
  if ($exitOk -and (-not $evidenceOk)) {
    Write-Host ''
    Write-Host '  EXIT CODE WAS ZERO AND THE EVIDENCE ASSERTION FAILED.'
    Write-Host '  This is the defect slice 2.1 exists to catch. The child reported success'
    Write-Host '  and produced nothing this harness can show you. Treat the gate as FAILED'
    Write-Host '  and do not read the exit code as a result. Check that the script actually'
    Write-Host '  ran, and that its terminal output line has not been reworded.'
  }

  return [pscustomobject]@{
    Name          = $Name
    Pass          = ($exitOk -and $evidenceOk)
    ExitCode      = $code
    ExitOk        = $exitOk
    Exists        = $exists
    Bytes         = $bytes
    SizeOk        = $sizeOk
    SentinelFound = $sentinelFound
    EvidenceOk    = $evidenceOk
    Lines         = $buffer.Count
    Capture       = $capture
    Reasons       = $reasons
  }
}

# ── Run header ────────────────────────────────────────────────────────────────
$prov = Get-Provenance

Write-Gate "COVERAGE MAP ACCEPTANCE  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "repo        $(Get-Location)"
Write-Host "commit      $($prov.Sha)"
Write-Host "short       $($prov.Short)"
Write-Host "branch      $($prov.Branch)"
Write-Host "worktree    $($prov.DirtyText)"
if ($prov.Dirty -and $prov.DirtyPaths.Count -gt 0) {
  foreach ($p in $prov.DirtyPaths) { Write-Host "              $p" }
  Write-Host ''
  Write-Host 'WORKING TREE IS DIRTY. The figures below describe the files on disk, which'
  Write-Host 'are not the files at the commit above. Do not publish a figure from this run'
  Write-Host 'against that sha.'
}
Write-Host "archive     $ArchiveId"
Write-Host "transcript  $transcript"
Write-Host "captures    $probeOut"

# ── SELF TEST ─────────────────────────────────────────────────────────────────
# Runs before the .env.local check on purpose: the self-test needs no credentials
# and no model calls, so it must stay runnable on a machine that cannot run a gate.
if ($SelfTest) {
  Write-Gate 'HARNESS SELF-TEST  (two stubs, zero model calls)'
  Write-Host 'Proves both failure paths. Neither stub is expected to pass. What is being'
  Write-Host 'checked is that each one FAILS FOR THE RIGHT REASON.'

  $selfTestPass = $true

  # ── Stub 1: the original defect. Exit 0, no output. ─────────────────────────
  Write-Gate 'SELF-TEST 1  silent stub, exits 0 and writes nothing'
  Write-Host 'Expected: gate FAILS on the evidence assertion, NOT on the exit code.'
  Write-Host 'This is the regression test for the bug that motivated slice 2.1.'
  Write-Host ''
  $s1 = Invoke-Gate -Name 'selftest-silent-zero' `
                    -Script 'scripts/_stub-silent-zero.ts' `
                    -Sentinel 'THIS SENTINEL CAN NEVER APPEAR' `
                    -SentinelSource 'scripts/_stub-silent-zero.ts (stub prints nothing by design)'

  $s1Right = ((-not $s1.Pass) -and $s1.ExitOk -and (-not $s1.EvidenceOk))
  Write-Host ''
  if ($s1Right) {
    Write-Host '  SELF-TEST 1 PASS. The gate failed, the exit code was zero, and the failure'
    Write-Host '  was the evidence assertion. Exactly the defect, caught.'
  } else {
    $selfTestPass = $false
    Write-Host '  SELF-TEST 1 FAILED TO FAIL CORRECTLY.'
    Write-Host "    gate passed        : $($s1.Pass)   expected False"
    Write-Host "    exit code was zero : $($s1.ExitOk) expected True"
    Write-Host "    evidence held      : $($s1.EvidenceOk) expected False"
    Write-Host '  If the gate PASSED, the evidence assertion has been weakened and this'
    Write-Host '  harness is back to trusting exit codes. Fix that before anything else.'
  }

  # ── Stub 2: loud failure. Output on both streams, exit 1. ───────────────────
  Write-Gate 'SELF-TEST 2  loud stub, writes both streams and exits 1'
  Write-Host 'Expected: gate FAILS on the exit code, and the evidence survives anyway.'
  Write-Host 'A harness that only records evidence on success is useless exactly when'
  Write-Host 'evidence matters most.'
  Write-Host ''
  $s2 = Invoke-Gate -Name 'selftest-loud-fail' `
                    -Script 'scripts/_stub-loud-fail.ts' `
                    -Sentinel '^STUB-SENTINEL-STDOUT' `
                    -SentinelSource 'scripts/_stub-loud-fail.ts:23 (console.log)'

  # stderr is checked separately. two-layer-probe.ts:205 writes progress with
  # console.error, so a construct that dropped stderr would lose real probe output.
  $stderrHit = $false
  if (Test-Path $s2.Capture) {
    if (Select-String -Path $s2.Capture -Pattern '^STUB-SENTINEL-STDERR' -ErrorAction SilentlyContinue) {
      $stderrHit = $true
    }
  }

  $s2Right = ((-not $s2.Pass) -and (-not $s2.ExitOk) -and $s2.SentinelFound -and $stderrHit)
  Write-Host ("  stderr captured  {0}   {1}" -f $stderrHit, $(if ($stderrHit) { 'ok' } else { 'FAIL' }))
  Write-Host ''
  if ($s2Right) {
    Write-Host '  SELF-TEST 2 PASS. The gate failed, the failure was the exit code, and both'
    Write-Host '  the stdout and the stderr lines are in the capture file.'
  } else {
    $selfTestPass = $false
    Write-Host '  SELF-TEST 2 FAILED TO FAIL CORRECTLY.'
    Write-Host "    gate passed        : $($s2.Pass)          expected False"
    Write-Host "    exit code nonzero  : $(-not $s2.ExitOk)   expected True"
    Write-Host "    stdout sentinel    : $($s2.SentinelFound) expected True"
    Write-Host "    stderr sentinel    : $stderrHit           expected True"
  }

  Write-Gate 'SELF-TEST SUMMARY'
  Write-Host ("  {0}  SELF-TEST 1  silent stub fails on evidence, not exit code" -f $(if ($s1Right) { 'PASS' } else { 'FAIL' }))
  Write-Host ("  {0}  SELF-TEST 2  loud stub fails on exit code, evidence intact" -f $(if ($s2Right) { 'PASS' } else { 'FAIL' }))
  Write-Host ''
  Write-Host "  capture 1  $($s1.Capture)   $($s1.Bytes) byte(s), $($s1.Lines) line(s)"
  Write-Host "  capture 2  $($s2.Capture)   $($s2.Bytes) byte(s), $($s2.Lines) line(s)"
  Write-Host ''

  if ($selfTestPass) {
    Write-Host 'SELF-TEST PASS. The harness can fail a gate visibly, in both directions.'
    Write-Host 'Zero model calls were spent.'
    Write-Host ''
    Write-Host "Transcript: $transcript"
    Stop-Transcript | Out-Null
    exit 0
  } else {
    Write-Host 'SELF-TEST FAILED. Do not trust any gate result from this harness until the'
    Write-Host 'self-test is green. A harness that cannot fail correctly cannot pass'
    Write-Host 'meaningfully either.'
    Write-Host ''
    Write-Host "Transcript: $transcript"
    Stop-Transcript | Out-Null
    exit 1
  }
}

if (-not (Test-Path '.env.local')) {
  Write-Host ''
  Write-Host 'ERROR: .env.local not found. Run this from the repo root.'
  Stop-Here 'setup'
}

# ── GATE 1 ────────────────────────────────────────────────────────────────────
# npm test is the one gate NOT wrapped in Invoke-Gate. vitest is a direct child of
# this shell rather than an npx tsx probe, its reporter already writes a visible
# summary to the transcript (unlike the tsx probes, which is the whole bug), and
# it has no single terminal output line to sentinel against. It stays on the exit
# code, and that is a deliberate exception rather than an oversight.
if ($OnlyRegression) {
  Write-Gate 'GATE 1  SKIPPED (-OnlyRegression)'
} else {
  Write-Gate 'GATE 1  unit tests (npm test)'
  npm test
  if ($LASTEXITCODE -ne 0) { Stop-Here 'GATE 1 unit tests' }
  Write-Host ''
  Write-Host 'GATE 1 PASS'
}

# ── GATE 1b ───────────────────────────────────────────────────────────────────
if ($SkipRegression) {
  Write-Gate 'GATE 1b  SKIPPED (-SkipRegression). Only valid if the prompt is unchanged.'
} else {
  Write-Gate 'GATE 1b  shared-prompt regression (two-layer + demo refusal)'
  Write-Host 'These guard the production successor route and the public demo, both of'
  Write-Host 'which import lib/entitySystemPrompt.ts. Roughly 10 minutes.'
  Write-Host ''

  Write-Host '--- scripts/two-layer-probe.ts (security contract) ---'
  # Sentinel: the last unconditional literal the probe prints. Everything after it
  # is model-generated spot-check text and therefore not assertable.
  $g1bA = Invoke-Gate -Name 'gate1b-two-layer' `
                      -Script 'scripts/two-layer-probe.ts' `
                      -Sentinel '^SPOT-CHECK equity \(verbatim, RAW\)$' `
                      -SentinelSource 'scripts/two-layer-probe.ts:248'
  if (-not $g1bA.Pass) {
    Write-Host ''
    Write-Host "  gate failed on: $($g1bA.Reasons -join '; ')"
    Write-Host '  The two-layer security contract regressed, or the harness could not see'
    Write-Host '  its output. Read the evidence block above to tell those two apart.'
    Write-Host '  Do NOT deploy on either.'
    Stop-Here 'GATE 1b two-layer-probe'
  }

  Write-Host ''
  Write-Host '--- scripts/demo-refusal-probe.ts (the sales demo refusal beat) ---'
  # Sentinel: the last UNCONDITIONAL literal. demo-refusal-probe.ts:217 prints
  # either 'ALL PASS' or a failure string, so keying on it would conflate "the
  # probe produced nothing" with "the probe ran and failed". Those are the two
  # states this slice exists to separate, so the sentinel sits one line earlier.
  $g1bB = Invoke-Gate -Name 'gate1b-demo-refusal' `
                      -Script 'scripts/demo-refusal-probe.ts' `
                      -Sentinel '^SUMMARY$' `
                      -SentinelSource 'scripts/demo-refusal-probe.ts:212'
  if (-not $g1bB.Pass) {
    Write-Host ''
    Write-Host "  gate failed on: $($g1bB.Reasons -join '; ')"
    Write-Host '  The demo refusal beat regressed. Do NOT deploy: /succession/demo is'
    Write-Host '  public and is the asset prospects are shown. Read which part failed.'
    Write-Host '  A covered control that stopped landing on deposit means the prompt was'
    Write-Host '  over-corrected and the entity now declines things the archive backs.'
    Stop-Here 'GATE 1b demo-refusal-probe'
  }

  Write-Host ''
  Write-Host 'GATE 1b PASS, with evidence:'
  Write-Host "  $($g1bA.Capture)   $($g1bA.Bytes) byte(s), $($g1bA.Lines) line(s)"
  Write-Host "  $($g1bB.Capture)   $($g1bB.Bytes) byte(s), $($g1bB.Lines) line(s)"
}

if ($OnlyRegression) {
  Write-Gate 'STOPPING AFTER GATE 1b (-OnlyRegression)'
  Write-Host 'GATE 2 and GATE 3 were NOT run, so the coverage map is UNJUDGED by this run.'
  Write-Host 'That is not the same as judged and green. Do not read this run as covering'
  Write-Host 'the map. It covers the shared prompt only.'
  Write-Host ''
  Write-Host "Commit:     $($prov.Sha)  ($($prov.Branch), $($prov.DirtyText))"
  Write-Host "Transcript: $transcript"
  Write-Host "Captures:   $probeOut"
  Stop-Transcript | Out-Null
  exit 0
}

# ── GATE 2 ────────────────────────────────────────────────────────────────────
Write-Gate 'GATE 2  fixture probe (fictional personas, nothing written)'
Write-Host 'Two runs per persona so domain stability can be gated. Budget 20 to 30 minutes.'
Write-Host ''
$g2 = Invoke-Gate -Name 'gate2-fixture' `
                  -Script 'scripts/coverage-fixture-probe.ts' `
                  -Sentinel '^SUMMARY$' `
                  -SentinelSource 'scripts/coverage-fixture-probe.ts:300'
$fixtureExit = $g2.ExitCode

# Exit code 2 is the harness failing, not a gate failing. The distinction is
# load bearing: an earlier version printed "the map failed to discriminate" when
# the real cause was a DNS lookup failing partway through, which is a conclusion
# the run had not established.
if ($fixtureExit -eq 2) {
  Write-Host ''
  Write-Host 'The fixture probe did not finish, so the map was NOT judged.'
  Write-Host 'It is unmeasured, not wrong. Re-run when the network is healthy.'
  Write-Host "Partial output, if any, is at $($g2.Capture)"
  Stop-Here 'GATE 2 harness failure (not a gate result)'
}
if (-not $g2.Pass) {
  Write-Host ''
  Write-Host "  gate failed on: $($g2.Reasons -join '; ')"
  if ($g2.ExitOk) {
    Write-Host '  Note the exit code was ZERO. This is an evidence failure, not a map'
    Write-Host '  failure. The map was not judged. Do not read it either way.'
  } else {
    Write-Host '  The map failed to discriminate on a fixture whose ground truth is known.'
    Write-Host '  Do NOT run gate 3. A map that cannot be trusted on Margaret cannot be'
    Write-Host '  read on a real archive, because nobody knows the right answer there.'
  }
  Stop-Here 'GATE 2 fixture probe'
}
Write-Host ''
Write-Host 'GATE 2 PASS'
Write-Host 'Domain drift is now gated, not just reported. Probe-level drift is still'
Write-Host 'printed and is expected; it only matters when it moves a domain.'
Write-Host "Evidence: $($g2.Capture)   $($g2.Bytes) byte(s), $($g2.Lines) line(s)"

# ── GATE 3 ────────────────────────────────────────────────────────────────────
if ($SkipDrive) {
  Write-Gate 'GATE 3  SKIPPED (-SkipDrive)'
} else {
  Write-Gate 'GATE 3  live drive (WRITES REAL ROWS)'
  Write-Host "archive $ArchiveId"
  Write-Host 'Requires BOTH coverage migrations to have been pasted into Supabase:'
  Write-Host '  20260815_coverage_map.sql then 20260816_coverage_overreach.sql'
  Write-Host ''
  $g3 = Invoke-Gate -Name 'gate3-drive' `
                    -Script 'scripts/coverage-drive.ts' `
                    -ScriptArgs @($ArchiveId) `
                    -Sentinel '^DONE in .+ run .+ ok=' `
                    -SentinelSource 'scripts/coverage-drive.ts:246'
  if (-not $g3.Pass) {
    Write-Host ''
    Write-Host "  gate failed on: $($g3.Reasons -join '; ')"
    Stop-Here 'GATE 3 live drive'
  }
  Write-Host ''
  Write-Host 'GATE 3 PASS'
  Write-Host "Evidence: $($g3.Capture)   $($g3.Bytes) byte(s), $($g3.Lines) line(s)"
}

Write-Gate 'ALL GATES PASS'
Write-Host 'Read the open-domain replies printed by gate 3 before trusting the map.'
Write-Host 'A domain reading open is a claim about the archive. If a reply there takes'
Write-Host 'a clear position that a real deposit backs, the probe is wrong, not the'
Write-Host 'archive.'
Write-Host ''
Write-Host "Commit:     $($prov.Sha)  ($($prov.Branch), $($prov.DirtyText))"
Write-Host "Transcript: $transcript"
Write-Host "Captures:   $probeOut"

Stop-Transcript | Out-Null
