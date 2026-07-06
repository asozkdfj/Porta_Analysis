# Porta 포터블 패키지 생성
# 사용: npm run build:portable
# 또는: powershell -ExecutionPolicy Bypass -File scripts/build-portable.ps1

param(
    [switch]$SkipBuild,
    [switch]$SkipNodeDownload
)

$ErrorActionPreference = "Stop"

$GaiaWebRoot = Split-Path -Parent $PSScriptRoot
$GaiaRoot = Split-Path -Parent $GaiaWebRoot
$OutDir = Join-Path $GaiaRoot "Porta-portable"
$NodeVersion = "22.16.0"
$NodeZipName = "node-v$NodeVersion-win-x64"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Porta 포터블 패키지 빌드" -ForegroundColor Cyan
Write-Host "  출력: $OutDir" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Next.js 빌드
Set-Location $GaiaWebRoot
if (-not $SkipBuild) {
    Write-Host "[1/5] npm install ..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install 실패" }

    $defaultTact = Join-Path $GaiaWebRoot "public\tact-time-default-stations.json"
    if (-not (Test-Path $defaultTact)) {
        Write-Host "[Tact Time] 기본 세팅 파일 없음 — export 시도 ..." -ForegroundColor DarkYellow
        node scripts/export-tact-time-default.mjs 2>$null
    }
    if (Test-Path $defaultTact) {
        $json = Get-Content $defaultTact -Raw | ConvertFrom-Json
        $groupCount = 0
        foreach ($p in $json.stations.PSObject.Properties) {
            $groupCount += @($p.Value.groups).Count
        }
        if ($groupCount -le 0) {
            Write-Host "[WARN] tact-time-default-stations.json 에 그룹이 없습니다." -ForegroundColor Yellow
            Write-Host "       dev 서버에서 Tact Time Setting → [배포용 기본값 저장] 후 다시 빌드하세요." -ForegroundColor Yellow
        } else {
            Write-Host "[Tact Time] 기본 세팅 $groupCount groups → portable 포함" -ForegroundColor Green
        }
    }

    Write-Host "[2/5] npm run build (standalone) ..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build 실패" }
} else {
    Write-Host "[1-2/5] 빌드 건너뜀 (-SkipBuild)" -ForegroundColor DarkYellow
}

$StandaloneDir = Join-Path $GaiaWebRoot ".next\standalone"
$StaticDir = Join-Path $GaiaWebRoot ".next\static"
$PublicDir = Join-Path $GaiaWebRoot "public"

if (-not (Test-Path (Join-Path $StandaloneDir "server.js"))) {
    throw "standalone 빌드 결과가 없습니다. next.config.ts 에 output: 'standalone' 확인 후 다시 빌드하세요."
}

# 2. 출력 폴더 준비
Write-Host "[3/5] app/ 복사 ..." -ForegroundColor Yellow
$AppDir = Join-Path $OutDir "app"
if (Test-Path $AppDir) {
    Remove-Item $AppDir -Recurse -Force
}
New-Item -ItemType Directory -Path $AppDir -Force | Out-Null

Copy-Item -Path (Join-Path $StandaloneDir "*") -Destination $AppDir -Recurse -Force

# 빌드 PC 경로가 배포 ZIP에 남지 않도록 런타임 마커 제거
$RuntimeMarker = Join-Path $AppDir ".gaia-data-root"
if (Test-Path $RuntimeMarker) {
    Remove-Item $RuntimeMarker -Force
}

$DestStatic = Join-Path $AppDir ".next\static"
New-Item -ItemType Directory -Path (Split-Path $DestStatic) -Force | Out-Null
Copy-Item -Path $StaticDir -Destination $DestStatic -Recurse -Force

$DestPublic = Join-Path $AppDir "public"
Copy-Item -Path $PublicDir -Destination $DestPublic -Recurse -Force

# 3. 실행 파일 복사
Write-Host "[4/5] Launcher files ..." -ForegroundColor Yellow
$PortableSrc = Join-Path $GaiaWebRoot "portable"
Copy-Item (Join-Path $PortableSrc "Start-Porta.bat") $OutDir -Force
Copy-Item (Join-Path $PortableSrc "Run-Server.bat") $OutDir -Force
Copy-Item (Join-Path $PortableSrc "README-portable.txt") (Join-Path $OutDir "README.txt") -Force

# 3b. Inbox 폴더
Write-Host "[4b/5] inbox/ 복사 ..." -ForegroundColor Yellow
$InboxSrc = Join-Path $GaiaWebRoot "inbox"
$InboxDest = Join-Path $OutDir "inbox"
if (Test-Path $InboxDest) {
    Remove-Item $InboxDest -Recurse -Force
}
Copy-Item -Path $InboxSrc -Destination $InboxDest -Recurse -Force

# 배포용 example CSV (inbox-examples/ → inbox/ 에 병합)
$ExamplesDir = Join-Path $GaiaWebRoot "inbox-examples"
if (Test-Path $ExamplesDir) {
    Write-Host "[4b/5] inbox-examples 병합 ..." -ForegroundColor Yellow
    Get-ChildItem -Path $ExamplesDir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($ExamplesDir.Length).TrimStart('\')
        $dest = Join-Path $InboxDest $rel
        $destParent = Split-Path $dest -Parent
        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }
        Copy-Item $_.FullName $dest -Force
    }
}

# 기본 GRR Config → inbox/config
$DefaultConfig = Join-Path $GaiaWebRoot "public\GaiaStat2grrConfig.csv"
$ConfigDestDir = Join-Path $InboxDest "config"
if (Test-Path $DefaultConfig) {
    New-Item -ItemType Directory -Path $ConfigDestDir -Force | Out-Null
    Copy-Item $DefaultConfig (Join-Path $ConfigDestDir "GaiaStat2grrConfig.csv") -Force
}

# 4. Node.js portable
$NodeDir = Join-Path $OutDir "node"
if (-not $SkipNodeDownload -and -not (Test-Path (Join-Path $NodeDir "node.exe"))) {
    Write-Host "[5/5] Node.js $NodeVersion 다운로드 ..." -ForegroundColor Yellow
    $ZipUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeZipName.zip"
    $ZipPath = Join-Path $env:TEMP "$NodeZipName.zip"
    $ExtractRoot = Join-Path $env:TEMP "gaia-node-extract"

    if (Test-Path $ExtractRoot) {
        Remove-Item $ExtractRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $ExtractRoot -Force | Out-Null

    Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractRoot -Force

    if (Test-Path $NodeDir) {
        Remove-Item $NodeDir -Recurse -Force
    }
    Move-Item (Join-Path $ExtractRoot $NodeZipName) $NodeDir

    Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    Remove-Item $ExtractRoot -Recurse -Force -ErrorAction SilentlyContinue
} elseif (Test-Path (Join-Path $NodeDir "node.exe")) {
    Write-Host "[5/5] Node.js 이미 존재 — 다운로드 건너뜀" -ForegroundColor DarkYellow
} else {
    Write-Host "[5/5] Node.js 다운로드 건너뜀 (-SkipNodeDownload)" -ForegroundColor DarkYellow
    Write-Host "      node\node.exe 를 직접 준비하세요." -ForegroundColor DarkYellow
}

# 완료
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  완료!" -ForegroundColor Green
Write-Host "  $OutDir" -ForegroundColor Green
Write-Host ""
Write-Host "  다른 PC로 배포:" -ForegroundColor White
  Write-Host "  1. Porta-portable 폴더 전체를 ZIP으로 압축" -ForegroundColor White
  Write-Host "  2. 다른 PC에서 압축 해제" -ForegroundColor White
  Write-Host "  3. 'Start-Porta.bat' double-click" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Location $GaiaWebRoot
