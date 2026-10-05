# QA: Word (COM) দিয়ে ফাইল খুলে প্রতিটি ছবির প্রকৃত মাপ (ইঞ্চি) ও অবস্থান মাপা।
# চালানো: powershell -File qa/word-measure-figures.ps1 <file1> [file2 ...]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $Files) {
    $p = (Resolve-Path $f).Path
    $doc = $word.Documents.Open($p, $false, $true)
    Write-Output ("== " + [IO.Path]::GetFileName($p) + "  inlineShapes=" + $doc.InlineShapes.Count + " shapes=" + $doc.Shapes.Count)
    $i = 0
    foreach ($s in $doc.InlineShapes) {
      $i++
      $prev = $s.Range.Paragraphs(1).Previous(1)
      $prevText = if ($prev) { $prev.Range.Text.Trim() } else { '' }
      if ($prevText.Length -gt 50) { $prevText = $prevText.Substring(0, 50) }
      Write-Output ("  #{0}: {1:N2} x {2:N2} in   scale={3}%   after: {4}" -f $i, ($s.Width / 72), ($s.Height / 72), [math]::Round($s.ScaleWidth), $prevText)
    }
    $doc.Close([ref]$false)
  }
} finally {
  $word.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
