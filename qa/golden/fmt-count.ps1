# হুবহু-মোড ফরম্যাট-গণনা (Word COM): .docx/.doc ফাইলে ছায়াযুক্ত অনুচ্ছেদ, লেখা-ছায়া, ছবি, ইটালিক/সুপারস্ক্রিপ্ট রান, টেবিল, পাতা।
# চালানো: powershell -File qa/golden/fmt-count.ps1 <file1> [file2 …]   — প্রতি ফাইলে এক লাইন সারাংশ
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  foreach ($f in $Files) {
    try {
      $doc = $word.Documents.Open((Resolve-Path $f).Path, $false, $true)
      $shP = 0; $shR = 0; $ital = 0; $sup = 0
      foreach ($p in $doc.Paragraphs) {
        $bg = $p.Range.ParagraphFormat.Shading.BackgroundPatternColor
        if ($bg -ne -16777216 -and $bg -ne 16777215 -and $p.Range.Text.Trim().Length -gt 0) { $shP++ }
      }
      # রান-স্তর (লেখা-ছায়া, ইটালিক, সুপারস্ক্রিপ্ট): শব্দ ধরে
      foreach ($w in $doc.Words) {
        if ($w.Text.Trim().Length -eq 0) { continue }
        if ($w.Font.Italic -eq -1) { $ital++ }
        if ($w.Font.Superscript -eq -1) { $sup++ }
        $rbg = $w.Shading.BackgroundPatternColor
        if ($rbg -ne -16777216 -and $rbg -ne 16777215) { $shR++ }
      }
      $img = $doc.InlineShapes.Count + @($doc.Shapes | Where-Object { $_.Type -eq 13 }).Count
      $pages = $doc.ComputeStatistics(2)
      Write-Output ("{0}`tpages={1} shadedPara={2} shadedWords={3} images={4} italicWords={5} superWords={6} tables={7}" -f (Split-Path $f -Leaf), $pages, $shP, $shR, $img, $ital, $sup, $doc.Tables.Count)
      $doc.Close([ref]0)
    } catch { Write-Output ("ERR`t{0}`t{1}" -f $f, $_.Exception.Message) }
  }
} finally { $word.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
