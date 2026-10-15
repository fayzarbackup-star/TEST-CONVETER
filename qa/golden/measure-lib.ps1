# সোনালি-মাপের যৌথ লাইব্রেরি (dot-source করে ব্যবহার): খোলা Word ডকুমেন্ট → মাপ (অনুচ্ছেদ/রান/টেবিল/আকৃতি/পাতা)।
# ব্যবহার: build-golden.ps1 (দোকানের ফাইল = সত্য) ও measure-doc.ps1 (আমাদের আউটপুট) — দুই দিকে হুবহু একই মাপ।
function R2([double]$v) { [math]::Round($v, 2) }
function StartOf($r) { $s = $r.Duplicate; $s.Collapse(1); $s }
function EndOf($r) { $e = $r.Duplicate; if ($e.End -gt $e.Start + 1) { [void]$e.MoveEnd(1, -1) }; $e.Collapse(0); $e }
function Clean([string]$t) { ($t -replace "[\r\a]", '') -replace "\v", "`n" }
# শুধু অভিন্ন বৈশিষ্ট্য (মিশ্র হলে Word দেয় ''/9999999)। রান-স্তরের ফন্ট/আকার Word-সংরক্ষিত .docx-এর XML থেকে
# finalize-golden.mjs পড়ে — শব্দ-ধরে COM-লুপ লম্বা ফাইলে মিনিট লাগাত (Job appl আটকে গিয়েছিল)।
function FontOf($rg) {
  $f = $rg.Font
  [ordered]@{ t = (Clean $rg.Text); font = $f.Name; size = $f.Size; b = $f.Bold; i = $f.Italic; u = $f.Underline; color = $f.Color }
}

function Measure-WordDoc($doc) {
  $doc.Repaginate()
  $ps = $doc.PageSetup
  $pages = $doc.Content.Characters.Last.Information(3)

  $paras = New-Object System.Collections.ArrayList
  $n = 0
  foreach ($p in $doc.Paragraphs) {
    $n++; $r = $p.Range; $fmt = $p.Format
    $s = StartOf $r; $e = EndOf $r
    $txt = Clean $r.Text
    [void]$paras.Add([ordered]@{
      n = $n; page = $s.Information(3); x = (R2 $s.Information(5)); y = (R2 $s.Information(6)); yEnd = (R2 $e.Information(6)); pageEnd = $e.Information(3)
      lines = $(if ($txt.Trim()) { $r.ComputeStatistics(1) } else { 1 }); inTable = [bool]$r.Information(12)
      al = $fmt.Alignment; li = (R2 $fmt.LeftIndent); fi = (R2 $fmt.FirstLineIndent); ri = (R2 $fmt.RightIndent)
      sb = (R2 $fmt.SpaceBefore); sa = (R2 $fmt.SpaceAfter); lsRule = $fmt.LineSpacingRule; ls = (R2 $fmt.LineSpacing)
      tabs = @($fmt.TabStops | ForEach-Object { [ordered]@{ pos = (R2 $_.Position); al = $_.Alignment; leader = $_.Leader } })
      shading = $fmt.Shading.BackgroundPatternColor
      runs = $(if ($txt.Trim()) { @(FontOf $r) } else { @() })
    })
  }

  $tables = New-Object System.Collections.ArrayList
  $ti = 0
  foreach ($t in $doc.Tables) {
    $ti++
    $cells = New-Object System.Collections.ArrayList
    foreach ($c in $t.Range.Cells) {
      $cs = StartOf $c.Range
      $bd = @(-1, -2, -3, -4 | ForEach-Object { $c.Borders.Item($_).LineStyle })
      [void]$cells.Add([ordered]@{
        row = $c.RowIndex; col = $c.ColumnIndex; w = (R2 $c.Width); h = (R2 $c.Height); hRule = $c.HeightRule
        page = $cs.Information(3); x = (R2 $cs.Information(5)); y = (R2 $cs.Information(6))
        shading = $c.Shading.BackgroundPatternColor; borders = $bd; valign = $c.VerticalAlignment
        t = (Clean $c.Range.Text); font = $c.Range.Font.Name; size = $c.Range.Font.Size; b = $c.Range.Font.Bold
      })
    }
    $ts = StartOf $t.Range
    [void]$tables.Add([ordered]@{ n = $ti; rows = $t.Rows.Count; cols = $t.Columns.Count; uniform = $t.Uniform; nested = $t.Tables.Count
      page = $ts.Information(3); x = (R2 $ts.Information(5)); y = (R2 $ts.Information(6)); cells = @($cells) })
  }

  $shapes = New-Object System.Collections.ArrayList
  foreach ($sh in $doc.Shapes) {
    $st = ''; $sruns = @()
    try { if ($sh.TextFrame.HasText) { $st = Clean $sh.TextFrame.TextRange.Text; $sruns = @(FontOf $sh.TextFrame.TextRange) } } catch {}
    $pg = $null; try { $pg = $sh.Anchor.Information(3) } catch {}
    $dash = $null; $lineOn = $null; try { $lineOn = $sh.Line.Visible; $dash = $sh.Line.DashStyle } catch {}
    $fill = $null; try { if ($sh.Fill.Visible) { $fill = $sh.Fill.ForeColor.RGB } } catch {}
    [void]$shapes.Add([ordered]@{ type = $sh.Type; page = $pg; left = (R2 $sh.Left); top = (R2 $sh.Top); w = (R2 $sh.Width); h = (R2 $sh.Height)
      relH = $sh.RelativeHorizontalPosition; relV = $sh.RelativeVerticalPosition; line = $lineOn; dash = $dash; fill = $fill; t = $st; runs = $sruns })
  }

  $hdr = ''; try { $hdr = Clean $doc.Sections(1).Headers(1).Range.Text } catch {}
  $pb = $null; try { $b = $doc.Sections(1).Borders; if ($b.Enable) { $pb = @(-1, -2, -3, -4 | ForEach-Object { $b.Item($_).LineStyle }) } } catch {}
  return [ordered]@{
    pages = $pages
    page = [ordered]@{ w = (R2 $ps.PageWidth); h = (R2 $ps.PageHeight); orient = $ps.Orientation; top = (R2 $ps.TopMargin); bottom = (R2 $ps.BottomMargin); left = (R2 $ps.LeftMargin); right = (R2 $ps.RightMargin); sections = $doc.Sections.Count; borders = $pb }
    header = $hdr; paragraphs = @($paras); tables = @($tables); shapes = @($shapes); inlineShapes = $doc.InlineShapes.Count
  }
}

function Write-Json($obj, [string]$path) {
  [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 10 -Compress), (New-Object Text.UTF8Encoding $false))
}
