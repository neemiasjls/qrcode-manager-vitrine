# Funções compartilhadas por start.ps1 e stop.ps1 (carregado com dot-source).
# Compatível com Windows PowerShell 5.1 e PowerShell 7. Salvo em UTF-8 com BOM.

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}
function Write-Ok([string]$Message)   { Write-Host "    [ok] $Message" -ForegroundColor Green }
function Write-Info([string]$Message) { Write-Host "    $Message" }
function Write-Aviso([string]$Message) { Write-Host "    [aviso] $Message" -ForegroundColor Yellow }

# Erro "esperado": interrompe o script com mensagem amigável (tratado no catch do script).
function Stop-WithError([string]$Message) {
    $ex = New-Object System.Exception $Message
    $ex.Data['DevScriptError'] = $true
    throw $ex
}

# Executa um comando nativo sem que o stderr vire exceção (PS 5.1) e devolve saída + exit code.
# -Stream mostra a saída na tela enquanto executa.
function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [switch]$Stream
    )
    $lines = New-Object System.Collections.Generic.List[string]
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $code = 1
    try {
        & $FilePath @ArgumentList 2>&1 | ForEach-Object {
            $s = "$_"
            if ($Stream) { Write-Host "    $s" }
            $lines.Add($s)
        }
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 0 }
    } catch {
        $lines.Add("$_")
        $code = 1
    } finally {
        $ErrorActionPreference = $prev
    }
    return [pscustomobject]@{
        ExitCode = $code
        Output   = $lines.ToArray()
        Text     = ($lines.ToArray() -join "`n")
    }
}

# Constantes do banco local (devem bater com o docker-compose.yml).
$script:ComposeProject = 'qrcode-manager'   # igual ao "name:" do docker-compose.yml
$script:DbContainer    = 'qrcode-manager-db'
$script:DbVolume       = 'qrcode-manager_pgdata'
$script:DbPort         = 54422

# Docker CLI: usa o do PATH; se não houver, tenta o caminho padrão do Docker Desktop.
function Resolve-DockerCli {
    $cmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($cmd) { return $true }
    $candidates = @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\resources\bin')
    )
    foreach ($dir in $candidates) {
        if ($dir -and (Test-Path -LiteralPath (Join-Path $dir 'docker.exe'))) {
            $env:Path = "$dir;$env:Path"
            return $true
        }
    }
    return $false
}

function Test-DockerRunning {
    $r = Invoke-Native -FilePath 'docker' -ArgumentList @('info', '--format', '{{.ServerVersion}}')
    return ($r.ExitCode -eq 0 -and $r.Text.Trim() -ne '')
}

function Find-DockerDesktopExe {
    $candidates = New-Object System.Collections.Generic.List[string]
    if ($env:ProgramFiles) { $candidates.Add((Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe')) }
    if ($env:ProgramW6432) { $candidates.Add((Join-Path $env:ProgramW6432 'Docker\Docker\Docker Desktop.exe')) }
    if (${env:ProgramFiles(x86)}) { $candidates.Add((Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe')) }
    if ($env:LOCALAPPDATA) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\Docker Desktop.exe'))
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe'))
    }
    # Instalação registrada (caso tenha sido instalada em outro diretório)
    $uninstallKeys = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($k in $uninstallKeys) {
        $items = @(Get-ItemProperty -Path $k -ErrorAction SilentlyContinue |
            Where-Object { $_.PSObject.Properties['DisplayName'] -and $_.DisplayName -like 'Docker Desktop*' })
        foreach ($it in $items) {
            if ($it.PSObject.Properties['InstallLocation'] -and $it.InstallLocation) {
                $candidates.Add((Join-Path $it.InstallLocation 'Docker Desktop.exe'))
            }
        }
    }
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { return $c }
    }
    return $null
}

# Converte a saída de "docker ps --format '{{.ID}} {{.Names}}'" em hashtable ID -> nome.
function ConvertTo-ContainerMap($Result) {
    $found = @{}
    if ($Result.ExitCode -ne 0) { return $found }
    foreach ($line in $Result.Output) {
        $parts = $line.Trim() -split '\s+', 2
        if ($parts.Count -lt 2) { continue }
        $found[$parts[0]] = $parts[1]
    }
    return $found
}

# Containers do projeto pelo label do Docker Compose (só os rodando; com -All, também os parados).
function Get-ProjectContainers([switch]$All) {
    $psArgs = @('ps')
    if ($All) { $psArgs += '-a' }
    $psArgs += @('--filter', "label=com.docker.compose.project=$($script:ComposeProject)", '--format', '{{.ID}} {{.Names}}')
    $r = Invoke-Native -FilePath 'docker' -ArgumentList $psArgs
    return (ConvertTo-ContainerMap $r)
}

# Containers do Supabase local ANTIGO deste projeto (rodando).
function Get-LegacySupabaseContainers {
    $r = Invoke-Native -FilePath 'docker' -ArgumentList @('ps', '--filter', 'label=com.supabase.cli.project=qrcode-manager', '--format', '{{.ID}} {{.Names}}')
    return (ConvertTo-ContainerMap $r)
}

function Test-DockerCompose {
    $r = Invoke-Native -FilePath 'docker' -ArgumentList @('compose', 'version')
    return ($r.ExitCode -eq 0)
}

function Get-ProcessInfo([int]$ProcessId) {
    try {
        return Get-CimInstance -ClassName Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
    } catch {
        return $null
    }
}

function Get-PortListenerPids([int]$Port) {
    $conns = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    return @($conns | ForEach-Object { [int]$_.OwningProcess } | Where-Object { $_ -gt 4 } | Sort-Object -Unique)
}

# Processo node.exe (ou o cmd.exe que o start.ps1 usa como invólucro, com -AllowCmd)
# cuja linha de comando aponta para este projeto.
function Test-IsProjectNode($ProcInfo, [string]$Root, [switch]$AllowCmd) {
    if (-not $ProcInfo) { return $false }
    $names = @('node.exe')
    if ($AllowCmd) { $names += 'cmd.exe' }
    if ($names -notcontains [string]$ProcInfo.Name) { return $false }
    $cmd = [string]$ProcInfo.CommandLine
    if (-not $cmd) { return $false }
    $norm = $cmd.Replace('/', '\')
    return ($norm.IndexOf($Root, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)
}

# Todos os node.exe do "next dev" deste projeto (pai e filhos), inclusive órfãos.
function Get-ProjectNextDevProcesses([string]$Root) {
    # node_modules\next\ = next dev e start-server.js; .next\ = workers do Turbopack (ex.: PostCSS)
    $nextDir = (Join-Path $Root 'node_modules\next\')
    $buildDir = (Join-Path $Root '.next\')
    $all = @(Get-CimInstance -ClassName Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue)
    return @($all | Where-Object {
            $cmd = [string]$_.CommandLine
            if (-not $cmd) { return $false }
            $norm = $cmd.Replace('/', '\')
            (($norm.IndexOf($nextDir, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) -or
             ($norm.IndexOf($buildDir, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)) -and
            ($norm -notmatch '\sbuild(\s|$)') -and ($norm -notmatch '\sstart(\s|$)')
        })
}

function Test-PortFree([int]$Port) {
    return (@(Get-PortListenerPids $Port).Count -eq 0)
}

# Primeira porta livre em [From, To] ou 0.
function Find-FreePort([int]$From, [int]$To) {
    for ($p = $From; $p -le $To; $p++) {
        if (Test-PortFree $p) { return $p }
    }
    return 0
}

# 48 bytes aleatórios em base64url (sem '=').
function New-RandomSecret {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_'))
}

function Stop-ProcessTree([int]$ProcessId) {
    $r = Invoke-Native -FilePath 'taskkill.exe' -ArgumentList @('/PID', "$ProcessId", '/T', '/F')
    return $r
}
