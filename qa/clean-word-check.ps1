# QA T1 (clean Word): open a .docx/.doc in Word, print one summary line - pages, tables, OMath, EQ fields, columns, first font.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
param([string]$File)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
try {
  $d = $w.Documents.Open($File, $false, $true)
  $pages = $d.ComputeStatistics(2)
  $eq = 0; foreach ($f in $d.Fields) { if ($f.Code.Text -match '^\s*EQ\b') { $eq++ } }
  $cols = $d.Sections(1).PageSetup.TextColumns.Count
  $font = $d.Paragraphs(1).Range.Font.Name
  "pages $pages | tables $($d.Tables.Count) | OMath $($d.OMaths.Count) | EQ $eq | cols $cols | font $font"
  $d.Close(0)
} catch { "ERR " + $_.Exception.Message } finally { $w.Quit() }
