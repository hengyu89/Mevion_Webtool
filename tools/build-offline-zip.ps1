$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$usageLabel = -join @(
  [char]0x89E3,
  [char]0x538B,
  [char]0x540E,
  [char]0x4F7F,
  [char]0x7528
)
$destination = Join-Path $projectRoot "downloads\TJH_Tool_v2.1.1_${usageLabel}.zip"
$htmlFiles = @(Get-ChildItem -LiteralPath $projectRoot -Filter "*.html" -File | Select-Object -ExpandProperty FullName)
$sourceItems = @(
  (Join-Path $projectRoot "assets"),
  (Join-Path $projectRoot "css"),
  (Join-Path $projectRoot "data"),
  (Join-Path $projectRoot "js")
) + $htmlFiles

Compress-Archive -LiteralPath $sourceItems -DestinationPath $destination -CompressionLevel Optimal -Force

$archive = Get-Item -LiteralPath $destination
Write-Host ("Built {0} ({1:N0} bytes)" -f $archive.FullName, $archive.Length)
