# WORK_PLAN A4: আমাদের আউটপুট (.docx/.doc) → সোনালির মতো একই মাপ (truth.raw.json-এর গঠন) + PDF।
# চালানো: powershell -File qa/golden/measure-doc.ps1 <in.docx> <out.json> [<out.pdf>]
param([string]$In, [string]$OutJson, [string]$OutPdf = "")
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'measure-lib.ps1')
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open((Resolve-Path $In).Path, $false, $true)
  try {
    # ২০২৬-১০-১২: আগে PDF, পরে মাপ — Measure-WordDoc Word-এর পাতা-বিন্যাস বদলায় (a15: সরাসরি PDF ১ পাতা, মাপের পরে ২ পাতা)
    if ($OutPdf) { $doc.SaveAs2([ref]$OutPdf, [ref]17) }
    $m = Measure-WordDoc $doc
    Write-Json $m $OutJson
    Write-Output ("pages={0} paras={1} tables={2} shapes={3}" -f $m.pages, $m.paragraphs.Count, $m.tables.Count, $m.shapes.Count)
  } finally { $doc.Close(0) }
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
