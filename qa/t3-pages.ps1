# T3e: Word COM-এ .docx-গুলোর পাতা-সংখ্যা — একটি Word-সেশনে। আউটপুট: প্রতি লাইনে "<পাতা>`t<ফাইল>"
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $Files) {
    try {
      $doc = $word.Documents.Open((Resolve-Path $f).Path, $false, $true)
      $n = $doc.ComputeStatistics(2)
      $doc.Close([ref]0)
      Write-Output ("{0}`t{1}" -f $n, $f)
    } catch { Write-Output ("ERR`t{0}" -f $f) }
  }
} finally { $word.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
