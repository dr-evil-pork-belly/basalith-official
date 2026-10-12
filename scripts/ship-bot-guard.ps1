# Commits the trial form bot guard and, on your word, pushes it to main.
# A push to main on this repo IS a production deploy.
#
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File C:\Users\mrdav\basalith-official\scripts\ship-bot-guard.ps1
#
# It stages only the ten files named below. Never "git add .". Anything else
# uncommitted in the working tree (slice 4b, slice C) is left exactly as it is.
# It stops, without committing, if: you are not on main, main is behind
# origin, tsc fails, the bot guard tests fail, or anything else is staged.
# It stops, after committing and before pushing, unless you type DEPLOY.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

$files = @(
  'lib/botGuard.ts',
  'lib/botGuard.test.ts',
  'app/api/trial/start/route.ts',
  'app/begin/BeginClient.tsx',
  'docs/TRIAL_BOT_GUARD_2026-10-10.md',
  'scripts/ship-bot-guard.ps1',
  'instrumentation-client.ts',
  'next.config.ts',
  'package.json',
  'package-lock.json'
)

function Stop-Here($why) {
  Write-Host ''
  Write-Host "STOPPED: $why" -ForegroundColor Red
  exit 1
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') { Stop-Here "you are on '$branch', not main." }

git fetch origin main
if ($LASTEXITCODE -ne 0) { Stop-Here 'git fetch failed.' }

$behind = [int](git rev-list --count HEAD..origin/main)
if ($behind -gt 0) { Stop-Here "main is $behind commit(s) behind origin/main. Pull first." }

$already = @(git diff --cached --name-only)
if ($already.Count -gt 0) {
  Write-Host 'Already staged before this script ran:'
  $already | ForEach-Object { Write-Host "  $_" }
  Stop-Here 'something is already staged. Unstage it (git restore --staged .) and run again.'
}

if (-not (Test-Path 'node_modules/botid')) {
  Write-Host ''
  Write-Host '== npm install (botid is new) ==' -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) { Stop-Here 'npm install failed.' }
}

Write-Host ''
Write-Host '== npx tsc --noEmit ==' -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Stop-Here 'tsc reported errors.' }

Write-Host ''
Write-Host '== npx vitest run lib/botGuard.test.ts ==' -ForegroundColor Cyan
npx vitest run lib/botGuard.test.ts
if ($LASTEXITCODE -ne 0) { Stop-Here 'the bot guard tests failed.' }

git add -- $files
if ($LASTEXITCODE -ne 0) { Stop-Here 'git add failed.' }

$staged = @(git diff --cached --name-only)
$extra = @($staged | Where-Object { $files -notcontains $_ })
if ($extra.Count -gt 0) {
  git restore --staged -- $files
  Stop-Here "unexpected files staged: $($extra -join ', ')"
}
if ($staged.Count -eq 0) { Stop-Here 'nothing to commit. The files match the last commit.' }

Write-Host ''
Write-Host '== Staged ==' -ForegroundColor Cyan
git diff --cached --stat

git commit `
  -m 'Trial form bot guard: honeypot, random letters test, Vercel BotID, hourly ceiling' `
  -m 'A script found /begin on October 9 and started trials for strangers'' mailboxes, several a day by October 12. POST /api/trial/start now runs four checks before any write: a hidden field (1b), a test for the script''s random letter names (1c), Vercel BotID (2b), and an hourly ceiling read from archives (2c). See docs/TRIAL_BOT_GUARD_2026-10-10.md.' `
  -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`nClaude-Session: https://claude.ai/code/session_0157KFXwQMAMKxyZXRL8Jr4c"
if ($LASTEXITCODE -ne 0) { Stop-Here 'git commit failed.' }

Write-Host ''
Write-Host '== Every commit a push would send to production ==' -ForegroundColor Cyan
git log origin/main..HEAD --format='%h %ad %s' --date=short

Write-Host ''
Write-Host 'If that list holds anything besides the bot guard commit, those go live too.' -ForegroundColor Yellow
$answer = Read-Host 'Type DEPLOY to push to main (production). Anything else leaves it committed and not pushed'
if ($answer -cne 'DEPLOY') {
  Write-Host 'Committed. NOT pushed. Nothing is live.'
  exit 0
}

git push origin main
if ($LASTEXITCODE -ne 0) { Stop-Here 'git push failed. The commit exists locally and is not live.' }

Write-Host ''
Write-Host 'Pushed. Vercel is building production now.' -ForegroundColor Green
git log -1 --format='%h %s'
