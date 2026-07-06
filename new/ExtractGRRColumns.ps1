# GaiaStat2grrConfig A column headers only -> extract from test log CSV. No install required.
# Use: double-click ExtractGRRColumns.bat, or put this .ps1 + .bat + 2 CSVs in same folder.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName Microsoft.VisualBasic

$folder = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $folder "GaiaStat2grrConfig.csv"

if (-not (Test-Path $configPath)) {
    Write-Host "GaiaStat2grrConfig.csv not found in folder."
    exit 1
}

# Load config headers (column A, skip first 3 rows)
$configHeaders = @()
$enc = [System.Text.Encoding]::UTF8
$cfgStream = New-Object System.IO.StreamReader($configPath, $enc)
$cfgParser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($cfgStream)
$cfgParser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
$cfgParser.SetDelimiters(",")
$rowNum = 0
while (-not $cfgParser.EndOfData) {
    $row = $cfgParser.ReadFields()
    $rowNum++
    if ($rowNum -le 3) { continue }
    if ($row -and $row[0].Trim()) { $configHeaders += $row[0].Trim() }
}
$cfgParser.Close()
$cfgStream.Close()

# Resolve log file
if ($args.Count -ge 1) {
    $logPath = $args[0]
    if (-not [System.IO.Path]::IsPathRooted($logPath)) { $logPath = Join-Path $folder $logPath }
} else {
    $candidates = Get-ChildItem -Path $folder -Filter "*.csv" -File | Where-Object { $_.Name -ne "GaiaStat2grrConfig.csv" }
    if (-not $candidates) {
        Write-Host "No test log CSV found. Put one CSV (besides GaiaStat2grrConfig) in the same folder."
        exit 1
    }
    $logPath = ($candidates | Sort-Object Length -Descending | Select-Object -First 1).FullName
}

if (-not (Test-Path $logPath)) {
    Write-Host "Log file not found: $logPath"
    exit 1
}

# Output path
if ($args.Count -ge 2) {
    $outPath = $args[1]
    if (-not [System.IO.Path]::IsPathRooted($outPath)) { $outPath = Join-Path $folder $outPath }
} else {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($logPath)
    $outPath = Join-Path $folder ($baseName + "_grr_only.csv")
    if (Test-Path $outPath) { $outPath = Join-Path $folder ($baseName + "_grr_only_new.csv") }
}

Write-Host "Config: GaiaStat2grrConfig.csv"
Write-Host "Log:   $([System.IO.Path]::GetFileName($logPath))"
Write-Host "Output: $([System.IO.Path]::GetFileName($outPath))"
Write-Host "Config header count: $($configHeaders.Count)"

# Stream log: first row = headers, get column indices (config order)
$logStream = New-Object System.IO.StreamReader($logPath, $enc)
$logParser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($logStream)
$logParser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
$logParser.SetDelimiters(",")

$logHeaders = $logParser.ReadFields()
$nameToIndex = @{}
for ($i = 0; $i -lt $logHeaders.Count; $i++) { $nameToIndex[$logHeaders[$i]] = $i }

$indicesInOrder = @()
foreach ($h in $configHeaders) {
    if ($nameToIndex.ContainsKey($h)) { $indicesInOrder += @($h, $nameToIndex[$h]) }
}

if ($indicesInOrder.Count -eq 0) {
    Write-Host "No log columns matched config headers. Check header names/encoding."
    $logParser.Close()
    $logStream.Close()
    exit 1
}

$outHeaders = @()
$indexList = @()
for ($i = 0; $i -lt $indicesInOrder.Count; $i += 2) {
    $outHeaders += $indicesInOrder[$i]
    $indexList += $indicesInOrder[$i + 1]
}

$maxIdx = ($indexList | Measure-Object -Maximum).Maximum

# Write output (UTF-8 with BOM for Excel)
$outStream = New-Object System.IO.StreamWriter($outPath, $false, $enc)
function EscapeCsv($s) {
    if ($null -eq $s) { return "" }
    $t = $s.ToString()
    if ($t -match '["\r\n,]') { return '"' + ($t -replace '"', '""') + '"' }
    return $t
}
$outStream.WriteLine(($outHeaders | ForEach-Object { EscapeCsv($_) }) -join ",")

$lineCount = 0
while (-not $logParser.EndOfData) {
    $row = $logParser.ReadFields()
    $lineCount++
    $outRow = @()
    foreach ($idx in $indexList) {
        if ($idx -lt $row.Count) { $outRow += $row[$idx] } else { $outRow += "" }
    }
    $outStream.WriteLine(($outRow | ForEach-Object { EscapeCsv($_) }) -join ",")
}

$logParser.Close()
$logStream.Close()
$outStream.Close()

Write-Host "Done. Rows written: $lineCount"
Write-Host "Output: $outPath"
