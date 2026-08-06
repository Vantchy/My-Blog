# Blog Build Script
# Run: powershell -ExecutionPolicy Bypass -File build.ps1
# Scans posts/*.html -> generates posts/index.json

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir
$dir       = Join-Path $RootDir "posts"

if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

# Scan for YYYY-MM-DD-title.html files
$files = @(Get-ChildItem -Path $dir -Filter "*.html" | Where-Object {
    $_.Name -match '^\d{4}-\d{2}-\d{2}-.+\.html$'
})

$articles = @()
foreach ($f in $files) {
    # Parse inside loop so $Matches is in scope
    $name = $f.Name -replace '\.html$', ''
    if ($name -match '^(\d{4}-\d{2}-\d{2})-(.+)$') {
        $articles += @{ file = $f.Name; title = $Matches[2]; date = $Matches[1] }
    }
}

# Sort by date descending
$articles = @($articles | Sort-Object -Property @{Expression={$_.date}; Descending=$true})

# Write index.json
$json = ConvertTo-Json -InputObject @($articles) -Depth 3
$path = Join-Path $dir "index.json"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $json, $utf8)

Write-Host "Done! index.json: $($articles.Count) articles"
foreach ($a in $articles) { Write-Host "  $($a.date)  $($a.title)" }
