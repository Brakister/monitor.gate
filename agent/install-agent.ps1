param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$ApiToken,

  [string]$UserId = 'endmin-root',
  [string]$DeviceName = $env:COMPUTERNAME,
  [int]$PollIntervalMs = 1000,
  [int]$ForegroundSliceSeconds = 2,
  [int]$SyncIntervalSeconds = 120,
  [int]$BatchSize = 300,
  [bool]$SendFullUrl = $false,
  [string]$NuGetSource = 'https://api.nuget.org/v3/index.json',
  [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'
$serviceName = 'MonitorGateAgent'
$projectPath = Join-Path $PSScriptRoot 'MonitorGate.Agent\MonitorGate.Agent.csproj'
$publishDir = Join-Path $PSScriptRoot 'publish'
$installDir = Join-Path $env:ProgramFiles 'MonitorGateAgent'
$exePath = Join-Path $installDir 'MonitorGate.Agent.exe'
$binaryPathName = "`"$exePath`""
$appSettingsPath = Join-Path $installDir 'appsettings.json'
$runtime = 'win-x64'

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  throw 'Permissao de Administrador obrigatoria. Execute pelo arquivo install-agent.bat (auto-elevacao) ou abra o PowerShell como Administrador.'
}

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $PSScriptRoot 'install-log.txt'
}

if (Test-Path $LogPath) {
  Remove-Item $LogPath -Force
}

Start-Transcript -Path $LogPath -Force | Out-Null

try {

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw 'dotnet SDK nao encontrado no PATH. Instale o .NET 8 SDK e tente novamente.'
}

if (-not (Test-Path $projectPath)) {
  throw "Projeto nao encontrado: $projectPath"
}

if (Test-Path $publishDir) {
  Remove-Item -Path $publishDir -Recurse -Force
}

Write-Host 'Publicando agente...'
Write-Host "Restaurando pacotes via NuGet source: $NuGetSource"
dotnet restore $projectPath --source $NuGetSource -r $runtime
if ($LASTEXITCODE -ne 0) {
  throw "Falha no restore de pacotes NuGet (codigo $LASTEXITCODE). Verifique internet/proxy/firewall e tente novamente."
}

dotnet publish $projectPath -c Release -r $runtime --self-contained true -p:PublishSingleFile=true --no-restore -o $publishDir
if ($LASTEXITCODE -ne 0) {
  throw "Falha no publish do agente (codigo $LASTEXITCODE)."
}

if (-not (Test-Path $publishDir)) {
  throw "Pasta de publish nao foi gerada: $publishDir"
}

Write-Host 'Copiando arquivos para pasta de instalacao...'
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Copy-Item -Path (Join-Path $publishDir '*') -Destination $installDir -Recurse -Force

if (-not (Test-Path $appSettingsPath)) {
  throw "appsettings.json nao encontrado apos copia: $appSettingsPath"
}

Write-Host 'Atualizando appsettings.json...'
$config = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
$config.Agent.UserId = $UserId
$config.Agent.DeviceName = $DeviceName
$config.Agent.PollIntervalMs = $PollIntervalMs
$config.Agent.ForegroundSliceSeconds = $ForegroundSliceSeconds
$config.Agent.SyncIntervalSeconds = $SyncIntervalSeconds
$config.Agent.BatchSize = $BatchSize
$config.Agent.ApiBaseUrl = $ApiBaseUrl
$config.Agent.ApiToken = $ApiToken
$config.Agent.SendFullUrl = $SendFullUrl
$config | ConvertTo-Json -Depth 6 | Set-Content $appSettingsPath -Encoding UTF8

$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($null -ne $existingService) {
  Write-Host 'Servico existente encontrado. Reinstalando...'
  sc.exe stop $serviceName | Out-Null
  sc.exe delete $serviceName | Out-Null
}

Write-Host 'Criando e iniciando servico...'
New-Service -Name $serviceName -BinaryPathName $binaryPathName -DisplayName 'MonitorGate Agent' -StartupType Automatic | Out-Null

Start-Service -Name $serviceName

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($null -eq $service) {
  throw "Servico $serviceName nao foi encontrado apos instalacao."
}

if ($service.Status -ne 'Running') {
  throw "Servico $serviceName criado, mas nao esta em Running (status atual: $($service.Status))."
}

Write-Host 'Instalacao concluida com sucesso.'
Write-Host "Servico: $serviceName"
Write-Host "Intervalo de sync: $SyncIntervalSeconds segundos"
Write-Host "Log de instalacao: $LogPath"
}
finally {
  Stop-Transcript | Out-Null
}
