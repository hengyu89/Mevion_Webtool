$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot "downloads\TJH_Tool_v2.1.1.zip"
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
