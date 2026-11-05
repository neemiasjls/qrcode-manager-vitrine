<#
.SYNOPSIS
    Para o ambiente local: Next.js (árvore de processos) e o container Postgres do projeto.

.DESCRIPTION
    Encerra o `next dev` iniciado pelo start.ps1 (e qualquer node do next dev deste projeto
    que tenha ficado órfão), roda `docker compose down` (remove o container; os dados
    persistem no volume) e confere no Docker que nenhum container do projeto sobrou. Se o Supabase local
    antigo deste projeto ainda estiver rodando, ele também é parado (sem apagar nada).
    Processos e containers de OUTROS projetos não são tocados.

.PARAMETER StopDocker
    Também fecha o Docker Desktop, mas só se não houver nenhum outro container rodando.

.EXAMPLE
    .\stop.ps1
.EXAMPLE
    .\stop.ps1 -StopDocker
#>
[CmdletBinding()]
param(
    [switch]$StopDocker
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot
$Root = (Get-Location).ProviderPath
. (Join-Path $Root 'scripts\dev-helpers.ps1')

$RunDir = Join-Path $Root '.run'
$PidFile = Join-Path $RunDir 'dev.pid'
$PortFile = Join-Path $RunDir 'dev.port'
# dev.baseurl é mantido de propósito: o start.ps1 o usa para detectar troca de porta.

$hadError = $false

try {
    Write-Host "QR Code Manager - parando ambiente local" -ForegroundColor White

    # ---------------------------------------------------------------- 1. Front
    Write-Step "Parando o front (Next.js)"
    $ports = New-Object System.Collections.Generic.List[int]
    if (Test-Path -LiteralPath $PortFile) {
        $p = 0
        if ([int]::TryParse(((Get-Content -LiteralPath $PortFile -Raw) -as [string]).Trim(), [ref]$p) -and $p -gt 0) { $ports.Add($p) }
    }
    if (-not $ports.Contains(3000)) { $ports.Add(3000) }

    $killed = 0
    if (Test-Path -LiteralPath $PidFile) {
        $savedPid = 0
        [void][int]::TryParse(((Get-Content -LiteralPath $PidFile -Raw) -as [string]).Trim(), [ref]$savedPid)
        $info = if ($savedPid -gt 0) { Get-ProcessInfo $savedPid } else { $null }
        if (-not $info) {
            Write-Info "PID salvo ($savedPid) não está mais rodando."
        } elseif (Test-IsProjectNode $info $Root -AllowCmd) {
            $r = Stop-ProcessTree $savedPid
            if ($r.ExitCode -eq 0) { Write-Ok "Árvore de processos do PID $savedPid encerrada"; $killed++ }
            else { Write-Aviso "taskkill no PID ${savedPid}: $($r.Text.Trim())" }
        } else {
            # PID reaproveitado pelo Windows por outro programa: não mata.
            Write-Aviso "PID salvo ($savedPid) agora pertence a outro programa ($($info.Name)); ignorado."
        }
    } else {
        Write-Info "Nenhum PID salvo em .run\dev.pid."
    }

    # Fallback 1: node deste projeto escutando nas portas do front
    foreach ($port in $ports) {
        foreach ($procId in @(Get-PortListenerPids $port)) {
            $info = Get-ProcessInfo $procId
            if (Test-IsProjectNode $info $Root) {
                # mata a partir do pai (next dev) se ele também for deste projeto
                $target = $procId
                $parent = Get-ProcessInfo ([int]$info.ParentProcessId)
                if (Test-IsProjectNode $parent $Root) { $target = [int]$parent.ProcessId }
                $r = Stop-ProcessTree $target
                if ($r.ExitCode -eq 0) { Write-Ok "Encerrado node deste projeto na porta $port (árvore do PID $target)"; $killed++ }
                else { Write-Aviso "taskkill no PID ${target}: $($r.Text.Trim())" }
            }
        }
    }

    # Fallback 2: qualquer node do next dev deste projeto que tenha ficado órfão
    foreach ($proc in @(Get-ProjectNextDevProcesses $Root)) {
        if (Get-ProcessInfo ([int]$proc.ProcessId)) {
            $r = Stop-ProcessTree ([int]$proc.ProcessId)
            if ($r.ExitCode -eq 0) { Write-Ok "Encerrado node órfão do next dev (PID $($proc.ProcessId))"; $killed++ }
        }
    }
    if ($killed -eq 0) { Write-Ok "O front não estava rodando" }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $PortFile -Force -ErrorAction SilentlyContinue

    # Confirma que as portas ficaram livres (de processos deste projeto)
    foreach ($port in $ports) {
        $deadline = (Get-Date).AddSeconds(10)
        do {
            $mine = @(); $others = @()
            foreach ($procId in @(Get-PortListenerPids $port)) {
                $info = Get-ProcessInfo $procId
                if (Test-IsProjectNode $info $Root) { $mine += $procId } else { $others += $procId }
            }
            if ($mine.Count -eq 0) { break }
            Start-Sleep -Milliseconds 500
        } while ((Get-Date) -lt $deadline)
        if ($mine.Count -gt 0) {
            Write-Host "    [ERRO] Porta $port ainda ocupada por node deste projeto (PID $($mine -join ', '))." -ForegroundColor Red
            $hadError = $true
        } elseif ($others.Count -gt 0) {
            $desc = ($others | ForEach-Object { $i = Get-ProcessInfo $_; if ($i) { "PID $_ $($i.Name)" } else { "PID $_" } }) -join '; '
            Write-Aviso "Porta $port está em uso por outro programa que não é deste projeto ($desc); não foi encerrado."
        } else {
            Write-Ok "Porta $port livre"
        }
    }
    $left = @(Get-ProjectNextDevProcesses $Root)
    if ($left.Count -gt 0) {
        Write-Host "    [ERRO] Ainda há node do next dev deste projeto rodando: PID $(($left | ForEach-Object { $_.ProcessId }) -join ', ')" -ForegroundColor Red
        $hadError = $true
    } else {
        Write-Ok "Nenhum node do next dev deste projeto rodando"
    }

    # ---------------------------------------------------------------- 2. Banco
    Write-Step "Parando o banco (Postgres)"
    $dockerOk = (Resolve-DockerCli) -and (Test-DockerRunning)
    if (-not $dockerOk) {
        Write-Ok "O Docker não está rodando: não há containers para parar."
    } else {
        $before = Get-ProjectContainers -All
        if ($before.Count -eq 0) {
            Write-Ok "Nenhum container do projeto existia."
        } else {
            # down remove o container; sem -v o volume (dados) é preservado
            Write-Info "$($before.Count) container(s) do projeto. Executando 'docker compose down' (os dados ficam no volume)..."
            $r = Invoke-Native -FilePath 'docker' -ArgumentList @('compose', 'down', '--timeout', '20') -Stream
            if ($r.ExitCode -ne 0) { Write-Aviso "'docker compose down' terminou com código $($r.ExitCode); conferindo containers pelo Docker." }
        }

        # Legado: Supabase local antigo deste projeto (parar não apaga nada)
        $legacy = Get-LegacySupabaseContainers
        if ($legacy.Count -gt 0) {
            Write-Aviso "O Supabase local antigo ainda estava rodando ($($legacy.Count) containers); parando (volumes preservados)."
            [void](Invoke-Native -FilePath 'docker' -ArgumentList (@('stop') + @($legacy.Keys)) -Stream)
        }

        # Verificação: nenhum container do projeto pode continuar existindo (nem parado)
        $leftC = Get-ProjectContainers -All
        if ($leftC.Count -gt 0) {
            Write-Aviso "Ainda restam $($leftC.Count) container(s): $(@($leftC.Values) -join ', '). Executando docker rm -f..."
            [void](Invoke-Native -FilePath 'docker' -ArgumentList (@('rm', '-f') + @($leftC.Keys)) -Stream)
            $leftC = Get-ProjectContainers -All
        }
        $leftL = Get-LegacySupabaseContainers
        if ($leftC.Count -eq 0 -and $leftL.Count -eq 0) {
            Write-Ok "0 containers do projeto (removidos; dados preservados no volume)"
        } else {
            $names = @($leftC.Values) + @($leftL.Values)
            Write-Host "    [ERRO] $($names.Count) container(s) do projeto continuam existindo: $($names -join ', ')" -ForegroundColor Red
            $hadError = $true
        }

        # Porta do banco: tem que ficar livre (pode ser outro programa)
        $deadline = (Get-Date).AddSeconds(10)
        while (-not (Test-PortFree $DbPort) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
        if (Test-PortFree $DbPort) {
            Write-Ok "Porta $DbPort livre"
        } else {
            $desc = (@(Get-PortListenerPids $DbPort) | ForEach-Object { $i = Get-ProcessInfo $_; if ($i) { "PID $_ $($i.Name)" } else { "PID $_" } }) -join '; '
            Write-Aviso "A porta $DbPort continua em uso ($desc); pode ser outro programa (não encerrei)."
        }

        # ------------------------------------------------------------ 3. Docker Desktop (opcional)
        if ($StopDocker) {
            Write-Step "Fechando o Docker Desktop (-StopDocker)"
            $all = Invoke-Native -FilePath 'docker' -ArgumentList @('ps', '--format', '{{.Names}}')
            $others = @($all.Output | Where-Object { $_.Trim() -ne '' })
            if ($all.ExitCode -ne 0) {
                Write-Aviso "Não consegui listar os containers; o Docker Desktop NÃO foi fechado."
            } elseif ($others.Count -gt 0) {
                Write-Aviso "Há $($others.Count) container(s) de outros projetos rodando ($($others -join ', ')); o Docker Desktop NÃO foi fechado."
            } else {
                $r = Invoke-Native -FilePath 'docker' -ArgumentList @('desktop', 'stop')
                if ($r.ExitCode -ne 0) {
                    Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
                }
                $deadline = (Get-Date).AddSeconds(60)
                while ((Get-Date) -lt $deadline -and (Test-DockerRunning)) { Start-Sleep -Seconds 2 }
                if (Test-DockerRunning) {
                    Write-Host "    [ERRO] O Docker ainda está respondendo após 60 s." -ForegroundColor Red
                    $hadError = $true
                } else {
                    Write-Ok "Docker Desktop fechado"
                }
            }
        }
    }
    if ($StopDocker -and -not $dockerOk) { Write-Info "(-StopDocker: o Docker já estava parado)" }

    Write-Host ""
    if ($hadError) {
        Write-Host "Terminou com problemas (veja as mensagens acima)." -ForegroundColor Red
        exit 1
    }
    Write-Host "Tudo parado. Os dados do banco foram preservados (volume qrcode-manager_pgdata); .\start.ps1 sobe de novo." -ForegroundColor Green
    exit 0
} catch {
    $ex = $_.Exception
    Write-Host ""
    if ($ex.Data.Contains('DevScriptError')) {
        Write-Host "[ERRO] $($ex.Message)" -ForegroundColor Red
    } else {
        Write-Host "[ERRO inesperado] $($ex.Message)" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    }
    exit 1
}
