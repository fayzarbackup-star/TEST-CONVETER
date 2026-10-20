# এক Word চালু রেখে অনেক .docx → PDF (প্রতি ফাইলে Word চালু/বন্ধের ~২০ সেকেন্ড বাঁচে)। স্কোরের জন্য মাপ লাগে না;
# কোনো কাজে "raw" দিলে measure-doc.ps1-এর মতো Measure-WordDoc-ও (PDF-এর পরে, কারণ মাপ পাতা-বিন্যাস বদলায়)।
# চালানো: powershell -File qa/golden/word-pdf-batch.ps1 <jobs.json>   jobs = [{ "docx": "...", "pdf": "...", "raw": "" }]
# ফল: প্রতি কাজে এক লাইন "ok|err <সেকেন্ড> <pdf>"
param([string]$Jobs)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'measure-lib.ps1')
$list = Get-Content -Raw -Encoding UTF8 $Jobs | ConvertFrom-Json
function New-Word { $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0; $w }
$word = New-Word
try {
  foreach ($j in $list) {
    $t0 = Get-Date
    try {
      $doc = $word.Documents.Open([System.IO.Path]::GetFullPath($j.docx), $false, $true)
      try {
        $doc.SaveAs2([ref][System.IO.Path]::GetFullPath($j.pdf), [ref]17)
        if ($j.raw) { Write-Json (Measure-WordDoc $doc) ([System.IO.Path]::GetFullPath($j.raw)) }
      } finally { $doc.Close(0) }
      Write-Output ("ok {0:n1} {1}" -f ((Get-Date) - $t0).TotalSeconds, $j.pdf)
    } catch {
      Write-Output ("err {0:n1} {1} {2}" -f ((Get-Date) - $t0).TotalSeconds, $j.pdf, ($_.Exception.Message -replace '\s+', ' '))
      # Word মরে গেলে (RPC) নতুন করে চালু, বাকি কাজ চলুক
      try { [void]$word.Documents.Count } catch { $word = New-Word }
    }
  }
} finally { try { $word.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
