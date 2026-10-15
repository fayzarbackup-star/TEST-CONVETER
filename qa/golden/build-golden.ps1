# WORK_PLAN A1: সোনালি নির্মাতা — দোকানের Word ফাইল → <out>/<id>/source.pdf + truth.raw.json (Word-এর আসল মাপ)।
# লেখা মূল এনকোডিংয়ে (বিজয় ASCII থাকতে পারে); ইউনিকোড-রূপান্তর ও PNG: qa/golden/finalize-golden.mjs।
# চালানো: powershell -File qa/golden/build-golden.ps1 [-Src <ফোল্ডার>] [-Out qa/golden-data] [-Only <নামের অংশ>] [-Force]
# ব্যক্তিগত তথ্য: আউটপুট শুধু লোকাল (qa/golden-data gitignore ও github_sync EXCLUDE-এ)।
param(
  [string]$Src = "$env:USERPROFILE\Downloads\SAMPLE",
  [string]$Out = "qa/golden-data",
  [string]$Only = "",
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'measure-lib.ps1')
$Out = (New-Item -ItemType Directory -Force $Out).FullName
$files = Get-ChildItem $Src -Recurse -File -Include *.doc, *.docx | Where-Object { $_.Name -notlike '~$*' } | Sort-Object FullName
if ($Only) { $files = $files | Where-Object { $_.FullName -like "*$Only*" } }

# স্থির id: আগের manifest থাকলে একই উৎসের একই id
$manPath = Join-Path $Out 'manifest.json'
$man = @{}
if (Test-Path $manPath) { (Get-Content $manPath -Raw -Encoding utf8 | ConvertFrom-Json) | ForEach-Object { $man[$_.src] = $_ } }
$next = [int](1 + (@($man.Values | ForEach-Object { [int]($_.id.Substring(1)) }) + 0 | Measure-Object -Maximum).Maximum)

$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
$ok = 0; $fail = @(); $skipped = 0
try {
  foreach ($fi in $files) {
    $rel = $fi.FullName.Substring($Src.TrimEnd('\').Length + 1)
    if ($man.ContainsKey($rel)) { $id = $man[$rel].id } else { $id = 'g{0:d2}' -f $next; $next++ }
    $entry = [ordered]@{ id = $id; src = $rel; folder = (Split-Path $rel -Parent) }
    $dir = Join-Path $Out $id
    if ((Test-Path (Join-Path $dir 'truth.raw.json')) -and -not $Force) { $skipped++; $man[$rel] = $entry; continue }
    New-Item -ItemType Directory -Force $dir | Out-Null
    $doc = $null
    try {
      $doc = $word.Documents.Open($fi.FullName, $false, $true)
      $doc.Repaginate()
      $doc.SaveAs2([ref](Join-Path $dir 'source.pdf'), [ref]17)
      $m = Measure-WordDoc $doc
      $truth = [ordered]@{ id = $id; src = $rel }
      foreach ($k in $m.Keys) { $truth[$k] = $m[$k] }
      Write-Json $truth (Join-Path $dir 'truth.raw.json')
      # রান-স্তরের সত্য (ফন্ট/আকার/মোটা) এই .docx-এর XML থেকে — finalize-golden.mjs
      $doc.SaveAs2([ref](Join-Path $dir 'source.docx'), [ref]16)
      $man[$rel] = $entry
      $ok++
    } catch {
      $fail += "$id $rel :: $($_.Exception.Message.Split("`n")[0])"
    } finally { if ($doc) { $doc.Close(0) } }
  }
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }

$list = @($man.Values | Sort-Object { $_.id })
[IO.File]::WriteAllText($manPath, (ConvertTo-Json @($list) -Depth 4), (New-Object Text.UTF8Encoding $false))
Write-Output ("built={0} skipped={1} failed={2} total-in-manifest={3}" -f $ok, $skipped, $fail.Count, $list.Count)
$fail | Select-Object -First 15
