# QA (ধাপ ১): Word (COM) দিয়ে এডিট-স্কোর মাপা।
# তৈরি .docx ফাইলের প্রতিটি ফাঁকা ঘর আর বিন্দু/ড্যাশ/লিডার-লাইনে "মোঃ আব্দুল করিম" বসিয়ে
# ৪টি মাপকাঠি মাপে: (১) পাতার সংখ্যা বদলাল কি না, (২) লাইন বা ঘর উপচে গেল কি না,
# (৩) ছকের সারি বা ঘর কতটা সরল, (৪) লেখা কাটল কি না (hRule=exact / lineRule=exact / frame)।
# চালানো: powershell -NoProfile -File qa/edit-score.ps1 <before.docx> <out.json> [after.docx] [sampleText]
param(
  [string]$In,
  [string]$OutJson,
  [string]$EditedIn = "",
  [string]$SampleText = "মোঃ আব্দুল করিম"
)

$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Measure-DocState($doc) {
  $doc.Repaginate()
  $pages = [int]$doc.Content.Characters.Last.Information(3) # wdActiveEndPageNumber = 3
  $frames = [int]$doc.Frames.Count + [int]$doc.Shapes.Count

  $paras = @()
  $pIdx = 0
  foreach ($p in $doc.Paragraphs) {
    $pIdx++
    $r = $p.Range
    $txt = $r.Text -replace "[\r\n\a]", ""
    $pg = [int]$r.Characters.First.Information(3)
    $y = [double]$r.Characters.First.Information(6) # wdVerticalPositionRelativeToPage = 6
    $x = [double]$r.Characters.First.Information(5) # wdHorizontalPositionRelativeToPage = 5
    $lns = [int]$r.ComputeStatistics(1)             # wdStatisticLines = 1
    $lsRule = [int]$p.LineSpacingRule               # wdLineSpaceExactly = 4
    $ls = [double]$p.LineSpacing
    $paras += @{
      i = $pIdx; page = $pg; y = [math]::Round($y, 1); x = [math]::Round($x, 1);
      lines = $lns; lsRule = $lsRule; ls = [math]::Round($ls, 1); len = $txt.Length
    }
  }

  $tables = @()
  $tIdx = 0
  foreach ($t in $doc.Tables) {
    $tIdx++
    $rows = @()
    $rIdx = 0
    foreach ($row in $t.Rows) {
      $rIdx++
      $hr = 0; $hVal = 0.0
      try { $hr = [int]$row.HeightRule; $hVal = [double]$row.Height } catch {}
      $fc = $row.Cells.Item(1).Range.Characters.First
      $pg = [int]$fc.Information(3)
      $y = [double]$fc.Information(6)
      $cells = @()
      $cIdx = 0
      foreach ($c in $row.Cells) {
        $cIdx++
        $cr = $c.Range
        $ct = ($cr.Text -replace "[\r\n\a\s]", "")
        $clns = [int]$cr.ComputeStatistics(1)
        $cw = [double]$c.Width
        $cx = [double]$cr.Characters.First.Information(5)
        $cy = [double]$cr.Characters.First.Information(6)
        $cells += @{
          c = $cIdx; w = [math]::Round($cw, 1); x = [math]::Round($cx, 1); y = [math]::Round($cy, 1);
          lines = $clns; empty = ($ct.Length -eq 0)
        }
      }
      $rows += @{
        r = $rIdx; page = $pg; y = [math]::Round($y, 1);
        hRule = $hr; h = [math]::Round($hVal, 1); cells = $cells
      }
    }
    $tables += @{ t = $tIdx; rows = $rows }
  }

  return @{ pages = $pages; frames = $frames; paras = $paras; tables = $tables }
}

function Apply-EditsInWord($doc, $sample) {
  $editedCells = 0
  $editedParas = 0
  foreach ($t in $doc.Tables) {
    foreach ($row in $t.Rows) {
      foreach ($c in $row.Cells) {
        if ($c.Tables.Count -gt 0) { continue }
        $raw = ($c.Range.Text -replace "[\r\n\a\s]", "")
        if ($raw.Length -eq 0) {
          $r = $c.Range
          $r.End = $r.End - 1
          if ($c.Width -le 24) {
            $r.Text = "৫"
          } else {
            $r.Text = $sample
          }
          $editedCells++
        }
      }
    }
  }
  foreach ($p in $doc.Paragraphs) {
    $r = $p.Range
    $txt = $r.Text -replace "[\r\n\a]", ""
    if ($txt -match "([._\-…·─━═])\1{3,}") {
      $r.End = $r.End - 1
      $r.Text = ($txt -replace "(([._\-…·─━═])\2{3,})", "$sample `$1")
      $editedParas++
    } elseif ($txt.Contains("`t") -and $p.TabStops.Count -gt 0) {
      $hasLeader = $false
      foreach ($ts in $p.TabStops) { if ([int]$ts.Leader -ne 0) { $hasLeader = $true; break } }
      if ($hasLeader) {
        $idx = $txt.LastIndexOf("`t")
        if ($idx -ge 0) {
          $r.End = $r.End - 1
          $r.Text = $txt.Substring(0, $idx) + " " + $sample + $txt.Substring($idx)
          $editedParas++
        }
      }
    }
  }
  return @{ editedCells = $editedCells; editedParas = $editedParas }
}

try {
  $inPath = (Resolve-Path $In).Path
  $d1 = $word.Documents.Open($inPath, $false, $true)
  $before = Measure-DocState $d1

  $editCounts = @{ editedCells = 0; editedParas = 0 }
  if ($EditedIn -ne "" -and (Test-Path $EditedIn)) {
    $d1.Close([ref]$false)
    $edPath = (Resolve-Path $EditedIn).Path
    $d2 = $word.Documents.Open($edPath, $false, $true)
    $after = Measure-DocState $d2
    $d2.Close([ref]$false)
  } else {
    $d1.Close([ref]$false)
    $d2 = $word.Documents.Open($inPath, $false, $false)
    $editCounts = Apply-EditsInWord $d2 $SampleText
    $after = Measure-DocState $d2
    if ($EditedIn -ne "") { $d2.SaveAs2([ref]$EditedIn) }
    $d2.Close([ref]$false)
  }

  $outObj = @{
    engine = "word-com"
    before = $before
    after = $after
    editCounts = $editCounts
  }
  $json = $outObj | ConvertTo-Json -Depth 10 -Compress
  [System.IO.File]::WriteAllText($OutJson, $json, [System.Text.Encoding]::UTF8)
  Write-Output ("pages={0}/{1}" -f $after.pages, $before.pages)
} finally {
  $word.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
