# Dev server: port 정리 후 기동, Ready 될 때까지 대기, 브라우저 오픈
$ErrorActionPreference = "Stop"
$GaiaWebRoot = Split-Path -Parent $PSScriptRoot
$Port = 3000

Set-Location $GaiaWebRoot

$PortableCandidates = @(
  (Join-Path (Split-Path $GaiaWebRoot) "Porta-portable"),
  (Join-Path (Split-Path $GaiaWebRoot) "GAIA-portable")
)
$PortableRoot = $null
foreach ($candidate in $PortableCandidates) {
  if (Test-Path (Join-Path $candidate "inbox")) {
    $PortableRoot = $candidate
    break
  }
}
if ($PortableRoot) {
  $env:PORTA_PORTABLE_ROOT = $PortableRoot
  $env:PORTA_INBOX_ROOT = Join-Path $PortableRoot "inbox"
  $env:PORTA_OUTBOX_ROOT = Join-Path $PortableRoot "outbox"
  $env:GAIA_PORTABLE_ROOT = $PortableRoot
  $env:GAIA_INBOX_ROOT = Join-Path $PortableRoot "inbox"
  $env:GAIA_OUTBOX_ROOT = Join-Path $PortableRoot "outbox"
  Write-Host "Inbox root: $($env:PORTA_INBOX_ROOT)" -ForegroundColor DarkCyan
}

$conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($conns) {
  Write-Host "Port $Port in use — stopping existing process..." -ForegroundColor Yellow
  $conns | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 1
}

Write-Host "Starting npm run dev ..." -ForegroundColor Cyan
$dev = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow

$ready = $false
for ($i = 0; $i -lt 120; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {}
  Start-Sleep -Seconds 1
}

if (-not $ready) {
  Write-Host "Server did not become ready in time." -ForegroundColor Red
  exit 1
}

Write-Host "Ready — opening http://localhost:$Port" -ForegroundColor Green
Start-Process "http://localhost:$Port/"
Wait-Process -Id $dev.Id
