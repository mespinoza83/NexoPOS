$ErrorActionPreference = 'SilentlyContinue'
foreach ($name in @('api','web')) {
  $pidFile = Join-Path $env:ProgramData "NexoPOS\$name.pid"
  if (Test-Path $pidFile) {
    $processId = [int](Get-Content $pidFile)
    Stop-Process -Id $processId -Force
    Remove-Item -LiteralPath $pidFile -Force
  }
}
