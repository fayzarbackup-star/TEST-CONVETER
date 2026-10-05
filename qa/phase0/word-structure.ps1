# ধাপ ০(খ): Word (COM) দিয়ে ফাইলের কাঠামো মাপা — চিহ্ন-শব্দ (P01…, T1…, H01…) ধরে প্রতিটি উপাদান টিকল কি না।
# চালানো: powershell -File qa/phase0/word-structure.ps1 <file1> [file2 ...]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
$alignName = @{0='left';1='center';2='right';3='justify'}
$tabAlign = @{0='left';1='center';2='right';3='decimal';4='bar'}
try {
  foreach ($f in $Files) {
    $doc = $word.Documents.Open((Resolve-Path $f).Path, $false, $true)
    Write-Output ("==== " + [IO.Path]::GetFileName($f))
    $s1 = $doc.Sections.Item(1).PageSetup
    Write-Output ("page {0:N2}x{1:N2}in  sections={2}  cols/section=[{3}]" -f ($s1.PageWidth/72), ($s1.PageHeight/72), $doc.Sections.Count, (($doc.Sections | ForEach-Object { $_.PageSetup.TextColumns.Count }) -join ','))
    $hdr = $doc.Sections.Item($doc.Sections.Count).Headers.Item(1).Range.Text.Trim()
    $ftr = $doc.Sections.Item($doc.Sections.Count).Footers.Item(1).Range.Text.Trim()
    Write-Output ("header='{0}'  footer='{1}'" -f $hdr, $ftr)
    foreach ($para in $doc.Paragraphs) {
      $t = $para.Range.Text
      $m = [regex]::Match($t, '((P\d\d|T\d)X[A-Z0-9]+)')
      if (-not $m.Success) { continue }
      $pf = $para.Format
      $tabs = @(); foreach ($ts in $pf.TabStops) { $tabs += ('{0}@{1:N0}pt{2}' -f $tabAlign[[int]$ts.Alignment], $ts.Position, $(if ($ts.Leader -ne 0) {'+lead'} else {''})) }
      $inTbl = $para.Range.Information(12)
      $bb = $pf.Borders.Item(-3).LineStyle
      Write-Output ("  {0,-16} align={1,-7} leftInd={2,5:N0}pt first={3,5:N0}pt tbl={4} botBorder={5} tabs=[{6}] size={7}" -f $m.Value, $alignName[[int]$pf.Alignment], $pf.LeftIndent, $pf.FirstLineIndent, $inTbl, $bb, ($tabs -join ' '), $para.Range.Font.Size)
    }
    Write-Output ("tables(top)={0}" -f $doc.Tables.Count)
    $ti = 0
    foreach ($tb in $doc.Tables) {
      $ti++
      $nested = $tb.Tables.Count
      $cells = $tb.Range.Cells.Count
      $bd = $tb.Borders.Enable
      $w = 0; try { $w = $tb.PreferredWidth } catch {}
      Write-Output ("  table#{0}: rows={1} cols={2} cells={3} nested={4} borders={5} prefWidth={6:N0} uniform={7}" -f $ti, $tb.Rows.Count, $tb.Columns.Count, $cells, $nested, $bd, $w, $tb.Uniform)
    }
    Write-Output ("inlineShapes={0} floatingShapes={1}" -f $doc.InlineShapes.Count, $doc.Shapes.Count)
    foreach ($sh in $doc.Shapes) { Write-Output ("  float: {0:N2}x{1:N2}in at left={2:N2}in top={3:N2}in" -f ($sh.Width/72), ($sh.Height/72), ($sh.Left/72), ($sh.Top/72)) }
    Write-Output ("pages={0}" -f $doc.ComputeStatistics(2))
    $doc.Close([ref]$false)
  }
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
