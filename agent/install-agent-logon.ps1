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
  [bool]$SendFullUrl = $false,
  [string]$NuGetSource = 'https://api.nuget.org/v3/index.json',
  [string]$TaskName = 'MonitorGateAgent-Logon',
  [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'
$projectPath = Join-Path $PSScriptRoot 'MonitorGate.Agent\MonitorGate.Agent.csproj'
$publishDir = Join-Path $PSScriptRoot 'publish'
$installDir = Join-Path $env:ProgramFiles 'MonitorGateAgent'
$exePath = Join-Path $installDir 'MonitorGate.Agent.exe'
$appSettingsPath = Join-Path $installDir 'appsettings.json'
$runtime = 'win-x64'

function Stop-AgentProcesses {
  try {
    Get-Process -Name 'MonitorGate.Agent' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
  catch {
  }
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  throw 'Permissao de Administrador obrigatoria. Execute pelo arquivo install-agent-logon.bat (auto-elevacao).'
}

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $PSScriptRoot 'install-logon-log.txt'
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
    throw "Falha no restore de pacotes NuGet (codigo $LASTEXITCODE)."
  }

  dotnet publish $projectPath -c Release -r $runtime --self-contained true -p:PublishSingleFile=true --no-restore -o $publishDir
  if ($LASTEXITCODE -ne 0) {
    throw "Falha no publish do agente (codigo $LASTEXITCODE)."
  }

  if (-not (Test-Path $publishDir)) {
    throw "Pasta de publish nao foi gerada: $publishDir"
  }

  $taskPath = '\MonitorGate\'
  $fullTaskName = "$taskPath$TaskName"

  # Stop legacy service before file copy to prevent locked native DLLs.
  $legacyService = Get-Service -Name 'MonitorGateAgent' -ErrorAction SilentlyContinue
  if ($null -ne $legacyService) {
    Write-Host 'Servico legado encontrado. Parando/removendo antes da copia...'
    sc.exe stop MonitorGateAgent | Out-Null
    sc.exe delete MonitorGateAgent | Out-Null
  }

  # Stop and remove scheduled task before replacing binaries.
  try {
    Stop-ScheduledTask -TaskPath $taskPath -TaskName $TaskName -ErrorAction SilentlyContinue
  }
  catch {
  }

  try {
    Unregister-ScheduledTask -TaskPath $taskPath -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  }
  catch {
  }

  # Kill any remaining agent process to avoid native SQLite DLL lock during overwrite.
  Stop-AgentProcesses

  Write-Host 'Copiando arquivos para pasta de instalacao...'
  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
  $copied = $false
  for ($i = 1; $i -le 8 -and -not $copied; $i++) {
    try {
      Copy-Item -Path (Join-Path $publishDir '*') -Destination $installDir -Recurse -Force
      $copied = $true
    }
    catch {
      if ($i -eq 8) {
        throw
      }

      Stop-AgentProcesses
      [System.Threading.Thread]::Sleep(500)
    }
  }

  if (-not (Test-Path $appSettingsPath)) {
    throw "appsettings.json nao encontrado apos copia: $appSettingsPath"
  }

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

  Write-Host 'Criando tarefa agendada no logon...'
  $action = New-ScheduledTaskAction -Execute $exePath
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 0)

  Register-ScheduledTask -TaskName $TaskName -TaskPath $taskPath -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'MonitorGate Agent iniciado no logon do usuario.' | Out-Null

  Write-Host 'Iniciando agente agora (sessao atual)...'
  Start-Process -FilePath $exePath -WindowStyle Hidden

  Write-Host 'Instalacao concluida com sucesso (modo logon).'
  Write-Host "Tarefa: $fullTaskName"
  Write-Host "Usuario: $env:USERDOMAIN\$env:USERNAME"
  Write-Host "Intervalo de sync: $SyncIntervalSeconds segundos"
  Write-Host "Log de instalacao: $LogPath"
}
finally {
  Stop-Transcript | Out-Null
}
