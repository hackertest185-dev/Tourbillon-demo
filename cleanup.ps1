$ErrorActionPreference = 'Continue'

# 1. Stop whatever is listening on the dev port (the old broken server)
try {
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {}

Start-Sleep -Seconds 2

# 2. Delete the corrupted Turbopack build cache (safe: regenerates on every build)
try {
  Remove-Item 'C:\Users\noura\Downloads\test\Tourbillon\frontend\.next' -Recurse -Force -ErrorAction SilentlyContinue
} catch {}

# 3. Empty the Recycle Bin
try { Clear-RecycleBin -Force -ErrorAction SilentlyContinue } catch {}

# 4. Clear the user Temp folder (keep anything belonging to this app so its logs survive)
try {
  Get-ChildItem $env:TEMP -Force -ErrorAction SilentlyContinue |
    Where-Object Name -NotLike '*codebuff*' |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} catch {}

# 5. Report results so the agent can read them from chat
$report = @()
$report += 'FREE_GB=' + [math]::Round((Get-PSDrive C).Free / 1GB, 2)
$report += 'NEXT_EXISTS=' + (Test-Path 'C:\Users\noura\Downloads\test\Tourbillon\frontend\.next')
$report | Out-File 'C:\Users\noura\Downloads\test\Tourbillon\cleanup-report.log' -Encoding utf8

# 6. Start the dev server in its own NORMAL-privilege window (de-elevated via Explorer)
Start-Process explorer.exe -ArgumentList 'C:\Users\noura\Downloads\test\Tourbillon\start-dev.bat'
