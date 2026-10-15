# QA: Word ফাইলের কাঠামো-সারাংশ (রিগ্রেশন-তুলনার জন্য): পাতা, অনুচ্ছেদ, লেখার দৈর্ঘ্য, টেবিল (সারি×কলাম/ঘর/বর্ডার/চওড়া), ছবি।
# চালানো: powershell -File qa/phase0/word-compare.ps1 <file1> [file2 ...]   — প্রতিটির সারাংশ পরপর ছাপে
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  foreach ($f in $Files) {
    $d = $word.Documents.Open((Resolve-Path $f).Path, $false, $true)
    Write-Output ("==== " + $f)
    Write-Output ("pages={0} sections={1} paragraphs={2} textLen={3} tables={4} inline={5} floating={6}" -f $d.ComputeStatistics(2), $d.Sections.Count, $d.Paragraphs.Count, $d.Content.Text.Length, $d.Tables.Count, $d.InlineShapes.Count, $d.Shapes.Count)
    $i = 0
    foreach ($tb in $d.Tables) {
      $i++; if ($i -gt 15) { break }
      $c = $tb.Range.Cells.Item(1)
      $bd = @(-1, -2, -3, -4 | ForEach-Object { if ($c.Borders.Item($_).LineStyle -ne 0) { 1 } else { 0 } }) -join ''
      Write-Output ("  t{0}: {1}x{2} cells={3} border(TLBR)={4} cell1W={5:N0}pt" -f $i, $tb.Rows.Count, $tb.Columns.Count, $tb.Range.Cells.Count, $bd, $c.Width)
    }
    $d.Close([ref]$false)
  }
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
