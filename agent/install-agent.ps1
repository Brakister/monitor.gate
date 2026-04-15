param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$ApiToken,

  [string]$UserId = 'endmin-root',
  [string]$DeviceName = $env:COMPUTERNAME,
  [int]$PollIntervalMs = 1000,
  [int]$SyncIntervalSeconds = 120,
  [int]$BatchSize = 300,
  [bool]$SendFullUrl = $false
)

$ErrorActionPreference = 'Stop'
$serviceName = 'MonitorGateAgent'
$projectPath = Join-Path $PSScriptRoot 'MonitorGate.Agent\MonitorGate.Agent.csproj'
$publishDir = Join-Path $PSScriptRoot 'publish'
$installDir = Join-Path $env:ProgramFiles 'MonitorGateAgent'
$exePath = Join-Path $installDir 'MonitorGate.Agent.exe'
$appSettingsPath = Join-Path $installDir 'appsettings.json'

Write-Host 'Publicando agente...'
dotnet publish $projectPath -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $publishDir

Write-Host 'Copiando arquivos para pasta de instalacao...'
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Copy-Item -Path (Join-Path $publishDir '*') -Destination $installDir -Recurse -Force

Write-Host 'Atualizando appsettings.json...'
$config = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
$config.Agent.UserId = $UserId
$config.Agent.DeviceName = $DeviceName
$config.Agent.PollIntervalMs = $PollIntervalMs
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
sc.exe create $serviceName binPath= "\"$exePath\"" start= auto DisplayName= "MonitorGate Agent"
sc.exe start $serviceName

Write-Host 'Instalacao concluida com sucesso.'
Write-Host "Servico: $serviceName"
Write-Host "Intervalo de sync: $SyncIntervalSeconds segundos"
