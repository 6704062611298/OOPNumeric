param([string]$docx, [string]$pdf)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $d = $word.Documents.Open($docx, $false, $true)
  # 17 = wdExportFormatPDF
  $d.ExportAsFixedFormat($pdf, 17)
  $d.Close($false)
  "exported: $pdf"
} finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
