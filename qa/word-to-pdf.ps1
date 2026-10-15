# QA: Word (COM) দিয়ে .docx/.doc → PDF (চোখে মেলানো ও মিল-মাপের জন্য)। চালানো: powershell -File qa/word-to-pdf.ps1 <in> <out.pdf>
param([string]$In, [string]$Out)
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $d = $word.Documents.Open((Resolve-Path $In).Path, $false, $true)
  $d.Repaginate()
  $d.SaveAs2([ref]$Out, [ref]17)
  # ComputeStatistics কখনো পাতা-বিন্যাস শেষের আগে ১ দেয় ⇒ শেষ অক্ষরের পাতা-নম্বর (wdActiveEndPageNumber=3)
  Write-Output ("pages={0}" -f $d.Content.Characters.Last.Information(3))
  $d.Close([ref]$false)
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
