param(
  [Parameter(Mandatory=$true)][string]$PostgresInstaller,
  [string]$NodeVersion = '22.23.2',
  [switch]$CompileInstaller
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$packageDir = Join-Path $PSScriptRoot 'package'
$distDir = Join-Path $PSScriptRoot 'dist'
if (!(Test-Path -LiteralPath $PostgresInstaller)) { throw 'No se encontró el instalador de PostgreSQL indicado.' }
foreach ($target in @($packageDir,$distDir)) {
  if (Test-Path $target) {
    $resolved = (Resolve-Path $target).Path
    if (!$resolved.StartsWith($PSScriptRoot + [IO.Path]::DirectorySeparatorChar)) { throw "Ruta de limpieza inválida: $resolved" }
    Remove-Item -LiteralPath ("\\?\" + $resolved) -Recurse -Force
  }
  New-Item -ItemType Directory -Force $target | Out-Null
}

Push-Location $repo
try {
  $env:NEXT_PUBLIC_API_URL = 'http://localhost:3001/api/v1'
  if (Test-Path 'apps/api/dist') { Remove-Item -LiteralPath 'apps/api/dist' -Recurse -Force }
  pnpm --filter @nexopos/api build
  if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del API.' }
  pnpm --filter @nexopos/web build
  if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación web.' }

  $apiPackage = Join-Path $packageDir 'api'
  New-Item -ItemType Directory -Force $apiPackage | Out-Null
  Copy-Item 'apps/api/package.json' $apiPackage
  Copy-Item 'apps/api/prisma' (Join-Path $apiPackage 'prisma') -Recurse -Force
  Push-Location $apiPackage
  try { pnpm install --prod --offline --config.node-linker=hoisted --lockfile=false --ignore-workspace; if($LASTEXITCODE -ne 0){throw 'No se pudieron instalar las dependencias del API.'} } finally { Pop-Location }
  Copy-Item 'apps/api/dist' (Join-Path $apiPackage 'dist') -Recurse -Force
  foreach ($name in @('src','tsconfig.json','tsconfig.build.json','tsconfig.spec.json','eslint.config.mjs')) { $path=Join-Path $apiPackage $name; if(Test-Path $path){Remove-Item -LiteralPath $path -Recurse -Force} }
  Get-ChildItem (Join-Path $apiPackage 'prisma') -File | Where-Object Name -ne 'schema.prisma' | Remove-Item -Force

  $webPackage = Join-Path $packageDir 'web'
  New-Item -ItemType Directory -Force $webPackage | Out-Null
  Copy-Item 'apps/web/package.json' $webPackage
  Push-Location $webPackage
  try { pnpm install --prod --offline --config.node-linker=hoisted --lockfile=false --ignore-workspace; if($LASTEXITCODE -ne 0){throw 'No se pudieron instalar las dependencias web.'} } finally { Pop-Location }
  Copy-Item 'apps/web/.next' (Join-Path $webPackage '.next') -Recurse -Force
  foreach ($name in @('src','tsconfig.json','next-env.d.ts','next.config.ts','eslint.config.mjs')) { $path=Join-Path $webPackage $name; if(Test-Path $path){Remove-Item -LiteralPath $path -Recurse -Force} }

  $runtimeDir = Join-Path $packageDir 'runtime'
  New-Item -ItemType Directory -Force $runtimeDir | Out-Null
  $nodeZip = Join-Path $env:TEMP "node-v$NodeVersion-win-x64.zip"
  if (!(Test-Path $nodeZip)) { Invoke-WebRequest "https://nodejs.org/download/release/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile $nodeZip }
  $nodeExtract = Join-Path $env:TEMP "nexopos-node-$NodeVersion"
  if (Test-Path $nodeExtract) { Remove-Item -LiteralPath $nodeExtract -Recurse -Force }
  Expand-Archive $nodeZip $nodeExtract
  Copy-Item (Join-Path $nodeExtract "node-v$NodeVersion-win-x64\node.exe") $runtimeDir

  New-Item -ItemType Directory -Force (Join-Path $packageDir 'runtime-scripts'),(Join-Path $packageDir 'vendor') | Out-Null
  Copy-Item 'deployment/windows/runtime/*' (Join-Path $packageDir 'runtime-scripts') -Recurse -Force
  Copy-Item 'deployment/windows/install.ps1','deployment/windows/uninstall.ps1' $packageDir
  Copy-Item $PostgresInstaller (Join-Path $packageDir 'vendor\postgresql-installer.exe')
  Copy-Item 'output/pdf/Manual_de_Usuario_NexoPOS.pdf' (Join-Path $packageDir 'Manual_de_Usuario_NexoPOS.pdf')

  Get-ChildItem $packageDir -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' -and ($_.Name.EndsWith('.d.ts') -or $_.Extension -in @('.map','.tsbuildinfo')) } | Remove-Item -Force
  $nextTypes = Join-Path $webPackage '.next\types'; if(Test-Path $nextTypes){Remove-Item -LiteralPath $nextTypes -Recurse -Force}
  $forbidden = Get-ChildItem $packageDir -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' -and ($_.Extension -in @('.ts','.tsx','.map','.tsbuildinfo') -or $_.Name -eq '.git') }
  if ($forbidden) { throw "El paquete contiene archivos fuente o mapas: $($forbidden.FullName -join ', ')" }
  Get-ChildItem $packageDir -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' } | Get-FileHash -Algorithm SHA256 | ForEach-Object { "$($_.Hash)  $($_.Path.Substring($packageDir.Length+1))" } | Set-Content (Join-Path $packageDir 'SHA256SUMS.txt') -Encoding ascii

  if ($CompileInstaller) {
    $compiler = Join-Path ${env:ProgramFiles} 'Inno Setup 7\ISCC.exe'
    if (!(Test-Path $compiler)) { throw 'Instala Inno Setup 7 x64 para compilar el instalador.' }
    & $compiler 'deployment/windows/NexoPOS.iss'
    if ($LASTEXITCODE -ne 0) { throw 'Falló Inno Setup.' }
  }
} finally { Pop-Location }
Write-Output "Paquete creado en $packageDir"
