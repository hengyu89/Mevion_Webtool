$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot "downloads\TJH_Tool_v2.0.1.zip"
$sourceItems = @(
  (Join-Path $projectRoot "assets"),
  (Join-Path $projectRoot "css"),
  (Join-Path $projectRoot "data"),
  (Join-Path $projectRoot "js"),
  (Join-Path $projectRoot "index.html")
)

Compress-Archive -LiteralPath $sourceItems -DestinationPath $destination -CompressionLevel Optimal -Force

$archive = Get-Item -LiteralPath $destination
Write-Host ("Built {0} ({1:N0} bytes)" -f $archive.FullName, $archive.Length)
