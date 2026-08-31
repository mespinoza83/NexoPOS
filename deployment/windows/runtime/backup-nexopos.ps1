param([string]$InstallDir = (Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference = 'Stop'
$configFile = Join-Path $env:ProgramData 'NexoPOS\nexopos.env'
$config = @{}
Get-Content $configFile | ForEach-Object { if ($_ -and !$_.StartsWith('#')) { $pair=$_ -split '=',2; if($pair.Count -eq 2){$config[$pair[0]]=$pair[1]} } }
$backupDir = Join-Path $env:ProgramData 'NexoPOS\backups'
New-Item -ItemType Directory -Force $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$pgDump = Join-Path $InstallDir 'postgres\bin\pg_dump.exe'
$env:PGPASSWORD = $config['POSTGRES_PASSWORD']
& $pgDump --host 127.0.0.1 --port $config['POSTGRES_PORT'] --username postgres --format custom --file (Join-Path $backupDir "nexopos-$stamp.backup") nexopos
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el respaldo.' }
Get-ChildItem $backupDir -Filter '*.backup' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force
