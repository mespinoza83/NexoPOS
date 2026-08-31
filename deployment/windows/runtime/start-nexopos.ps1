param([string]$InstallDir = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $InstallDir 'runtime\node.exe'
$logs = Join-Path $env:ProgramData 'NexoPOS\logs'
New-Item -ItemType Directory -Force $logs | Out-Null

function Start-NexoProcess([string]$Name, [string]$WorkingDirectory, [string[]]$Arguments) {
  $pidFile = Join-Path $env:ProgramData "NexoPOS\$Name.pid"
  if (Test-Path $pidFile) {
    $existingId = [int](Get-Content $pidFile -ErrorAction SilentlyContinue)
    if (Get-Process -Id $existingId -ErrorAction SilentlyContinue) { return }
  }
  $process = Start-Process -FilePath $runtime -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "$Name.log") -RedirectStandardError (Join-Path $logs "$Name-error.log") -PassThru
  Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii
}

$envFile = Join-Path $env:ProgramData 'NexoPOS\nexopos.env'
if (!(Test-Path $envFile)) { throw "No existe la configuración $envFile" }
Get-Content $envFile | ForEach-Object {
  if ($_ -and !$_.StartsWith('#')) {
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) { [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process') }
  }
}
$env:NODE_ENV = 'production'
Start-NexoProcess 'api' (Join-Path $InstallDir 'api') @('dist/src/main.js')
Start-NexoProcess 'web' (Join-Path $InstallDir 'web') @('node_modules/next/dist/bin/next','start')
