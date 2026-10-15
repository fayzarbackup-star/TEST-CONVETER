# QA: .doc/.docx-এর প্রতিটি টেবিলের সারি-ঘর গঠন (Word COM) — জোড়া ঘর/নেস্টেড ছক ধরতে। চালানো: powershell -File qa/table-inspect.ps1 <doc> <out.txt>
param([string]$doc, [string]$out)
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$d = $w.Documents.Open($doc, $false, $true)
$sb = New-Object System.Text.StringBuilder
$ti = 0
foreach ($t in $d.Tables) {
  $ti++
  $pg = $t.Range.Information(3)
  [void]$sb.AppendLine("T$ti page=$pg rows=$($t.Rows.Count) nested=$($t.Tables.Count) uniform=$($t.Uniform)")
  foreach ($c in $t.Range.Cells) {
    $txt = $c.Range.Text
    if ($txt.Length -gt 30) { $txt = $txt.Substring(0, 30) }
    $txt = $txt -replace "[\r\n\a]", ' '
    [void]$sb.AppendLine("  r$($c.RowIndex)c$($c.ColumnIndex) w=$([math]::Round($c.Width,1)) | $txt")
  }
}
$d.Close($false)
$w.Quit()
[IO.File]::WriteAllText($out, $sb.ToString(), [Text.Encoding]::UTF8)
