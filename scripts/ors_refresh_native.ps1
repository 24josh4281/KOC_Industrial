param([Parameter(Mandatory=$true)][string]$PlanPath)
$ErrorActionPreference='Stop'
$plan=Get-Content -LiteralPath $PlanPath -Raw -Encoding utf8 | ConvertFrom-Json
$excel=$null;$wb=$null
try {
 $excel=New-Object -ComObject Excel.Application
 $excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.EnableEvents=$false;$excel.AutomationSecurity=3;$excel.AskToUpdateLinks=$false
 $dummy=$excel.Workbooks.Add();$excel.Calculation=-4135;$excel.CalculateBeforeSave=$false
 foreach($book in $plan.books){
  if(Test-Path -LiteralPath $book.output){throw 'Refusing to overwrite output workbook'}
  $wb=$excel.Workbooks.Open($book.input,0,$true)
  foreach($change in @($plan.writes | Where-Object {$_.book -eq $book.id})){
   $cell=$wb.Worksheets.Item($change.sheet).Cells.Item([int]$change.row,[int]$change.col)
   if($cell.HasFormula){throw 'Refusing to replace an existing formula'}
   if([string]$cell.Value2 -ne [string]$change.before){throw 'Source changed after planning; run again'}
   # Imports are literal values, never Excel formulas.
   $oldFormat=$cell.NumberFormat
   if($change.value -is [string]){$cell.NumberFormat='@';$cell.Value2=$change.value;$cell.NumberFormat=$oldFormat}
   else{$cell.Value2=$change.value}
  }
  foreach($name in $book.calculate){$wb.Worksheets.Item($name).Calculate()}
  if($wb.SlicerCaches.Count -ne 10 -or $wb.Worksheets.Item('DB_대시보드').ChartObjects().Count -ne 6){throw 'Chart or slicer missing'}
  $raw=$wb.Worksheets.Item('DB_연동원장');$end=$raw.ListObjects.Item(1).Range.Row+$raw.ListObjects.Item(1).Range.Rows.Count-1
  $count=$excel.WorksheetFunction.Sum($raw.Range("R25:R$end"))
  foreach($co in $wb.Worksheets.Item('DB_대시보드').ChartObjects()){
   $total=0;foreach($value in $co.Chart.SeriesCollection(1).Values){$total+=[double]$value}
   if($count -ne $total){throw 'Chart total differs from linked source rows'}
  }
  $wb.SaveCopyAs($book.output)
  $wb.Close($false);$wb=$null
  Write-Output "$($book.id): refreshed copy saved."
 }
 $dummy.Close($false)
}finally{
 if($wb){$wb.Close($false)}
 if($excel){$excel.Quit();[Runtime.InteropServices.Marshal]::ReleaseComObject($excel)|Out-Null}
 [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
