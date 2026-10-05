# QA: Worker placement অঞ্চলগুলো পালা করে ডিপ্লয় → placement-bench। শেষে wrangler.toml মূল অবস্থায় ফেরে
# (চূড়ান্ত অঞ্চল আলাদাভাবে বসানো হয়)। চালানো: powershell -File qa/placement-sweep.ps1 "<pdf>" region1 region2 ...
param([string]$Pdf, [Parameter(ValueFromRemainingArguments = $true)][string[]]$Regions)
$root = Split-Path $PSScriptRoot -Parent
$proxy = Join-Path $root 'fayzar-ocr-proxy'
$toml = Join-Path $proxy 'wrangler.toml'
$orig = [IO.File]::ReadAllText($toml)
try {
  foreach ($r in $Regions) {
    [IO.File]::WriteAllText($toml, $orig.TrimEnd() + "`n`n[placement]`nregion = `"$r`"`n", (New-Object Text.UTF8Encoding($false)))
    Push-Location $proxy
    $out = & .\node_modules\.bin\wrangler.cmd deploy --message "placement sweep $r" 2>&1 | Select-Object -Last 1
    Pop-Location
    Write-Output "== $r : $out"
    Start-Sleep -Seconds 25
    node (Join-Path $root 'qa/placement-bench.mjs') $r 5 $Pdf
  }
} finally {
  [IO.File]::WriteAllText($toml, $orig, (New-Object Text.UTF8Encoding($false)))
}
