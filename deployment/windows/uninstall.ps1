param([Parameter(Mandatory=$true)][string]$InstallDir)
$ErrorActionPreference = 'SilentlyContinue'
& (Join-Path $InstallDir 'runtime-scripts\stop-nexopos.ps1')
schtasks /Delete /TN 'NexoPOS Inicio' /F | Out-Null
schtasks /Delete /TN 'NexoPOS Respaldo Diario' /F | Out-Null
Stop-Service 'NexoPOSPostgreSQL' -Force
sc.exe delete 'NexoPOSPostgreSQL' | Out-Null
# Los datos y respaldos en ProgramData\NexoPOS se conservan deliberadamente.
