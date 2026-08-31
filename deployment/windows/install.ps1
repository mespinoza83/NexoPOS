param(
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [Parameter(Mandatory=$true)][string]$CustomerName,
  [Parameter(Mandatory=$true)][string]$AdminEmail,
  [Parameter(Mandatory=$true)][string]$AdminPassword
)
$ErrorActionPreference = 'Stop'
if ($AdminPassword.Length -lt 12) { throw 'La contraseña administrativa debe tener al menos 12 caracteres.' }
$dataDir = Join-Path $env:ProgramData 'NexoPOS'
New-Item -ItemType Directory -Force $dataDir,(Join-Path $dataDir 'logs'),(Join-Path $dataDir 'backups') | Out-Null

function New-Secret([int]$Length=40) {
  $bytes = New-Object byte[] $Length
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return [Convert]::ToBase64String($bytes).Replace('=','').Replace('+','A').Replace('/','B').Substring(0,$Length)
}
$dbPassword = New-Secret 28
$accessSecret = New-Secret 48
$refreshSecret = New-Secret 48
$machineGuid = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Cryptography').MachineGuid
$sha256 = [Security.Cryptography.SHA256]::Create()
try { $machineHash = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($machineGuid)) } finally { $sha256.Dispose() }
$installationId = ([BitConverter]::ToString($machineHash).Replace('-','')).Substring(0,24)

$postgresInstaller = Join-Path $InstallDir 'vendor\postgresql-installer.exe'
if (!(Test-Path $postgresInstaller)) { throw 'El paquete no contiene PostgreSQL.' }
$postgresDir = Join-Path $InstallDir 'postgres'
$postgresData = Join-Path $dataDir 'postgres-data'
$arguments = @('--mode','unattended','--unattendedmodeui','none','--superpassword',$dbPassword,'--servicepassword',$dbPassword,'--serverport','5433','--prefix',$postgresDir,'--datadir',$postgresData,'--servicename','NexoPOSPostgreSQL','--disable-components','pgAdmin,stackbuilder')
$process = Start-Process -FilePath $postgresInstaller -ArgumentList $arguments -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "PostgreSQL terminó con código $($process.ExitCode)." }

$envContent = @(
  'NODE_ENV=production',
  'API_PORT=3001',
  'PORT=3000',
  'HOSTNAME=127.0.0.1',
  "DATABASE_URL=postgresql://postgres:$dbPassword@127.0.0.1:5433/nexopos?schema=public",
  "POSTGRES_PASSWORD=$dbPassword",
  'POSTGRES_PORT=5433',
  "JWT_ACCESS_SECRET=$accessSecret",
  "JWT_REFRESH_SECRET=$refreshSecret",
  'WEB_ORIGIN=http://localhost:3000',
  "SEED_ADMIN_EMAIL=$AdminEmail",
  "SEED_ADMIN_PASSWORD=$AdminPassword",
  "NEXOPOS_CUSTOMER=$CustomerName",
  "NEXOPOS_INSTALLATION_ID=$installationId"
)
Set-Content -LiteralPath (Join-Path $dataDir 'nexopos.env') -Value $envContent -Encoding utf8

$env:PGPASSWORD = $dbPassword
$createdb = Join-Path $postgresDir 'bin\createdb.exe'
& $createdb --host 127.0.0.1 --port 5433 --username postgres nexopos
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la base de datos.' }

Get-Content (Join-Path $dataDir 'nexopos.env') | ForEach-Object { $pair=$_ -split '=',2; if($pair.Count -eq 2){[Environment]::SetEnvironmentVariable($pair[0],$pair[1],'Process')} }
Push-Location (Join-Path $InstallDir 'api')
try {
  & (Join-Path $InstallDir 'runtime\node.exe') 'node_modules\prisma\build\index.js' migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'Falló la migración de base de datos.' }
  & (Join-Path $InstallDir 'runtime\node.exe') 'dist/prisma/seed.js'
  if ($LASTEXITCODE -ne 0) { throw 'Falló la configuración inicial.' }
} finally { Pop-Location }

$taskUser = 'SYSTEM'
$startScript = Join-Path $InstallDir 'runtime-scripts\start-nexopos.ps1'
$backupScript = Join-Path $InstallDir 'runtime-scripts\backup-nexopos.ps1'
schtasks /Create /TN 'NexoPOS Inicio' /SC ONSTART /RU $taskUser /RL HIGHEST /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -InstallDir `"$InstallDir`"" /F | Out-Null
schtasks /Create /TN 'NexoPOS Respaldo Diario' /SC DAILY /ST 02:00 /RU $taskUser /RL HIGHEST /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$backupScript`" -InstallDir `"$InstallDir`"" /F | Out-Null
& $startScript -InstallDir $InstallDir
@{ customer=$CustomerName; installationId=$installationId; installedAt=(Get-Date).ToString('o'); licenseType='PERPETUAL_SINGLE_DEVICE' } | ConvertTo-Json | Set-Content (Join-Path $dataDir 'license.json') -Encoding utf8
