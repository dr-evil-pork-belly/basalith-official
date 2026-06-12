Get-Content "$PSScriptRoot\..\.env.local" | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'))
  }
}
Write-Host "env loaded"
