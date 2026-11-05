<#
.SYNOPSIS
    Sobe o ambiente local completo: Docker Desktop, Postgres (1 container) e o Next.js (em segundo plano).

.DESCRIPTION
    Verifica pré-requisitos, abre o Docker Desktop se necessário, instala dependências,
    cria/completa o .env.local, sobe o container Postgres (docker compose), aplica as
    migrações, cria os usuários de teste no primeiro start e inicia o `next dev` em
    segundo plano (logs em .run\).
    Pode ser executado várias vezes: o que já estiver rodando não é duplicado.

.PARAMETER NoBrowser
    Não abre o navegador ao final.

.PARAMETER Port
    Porta do Next.js. Opcional: sem -Port usa a 3000 se estiver livre; se estiver ocupada por
    outro programa, escolhe a primeira livre entre 3001 e 3020 e avisa. Com -Port explícito e
    ocupada por outro programa, dá erro.

.PARAMETER Seed
    Força rodar o seed de usuários de teste mesmo que já existam usuários.

.EXAMPLE
    .\start.ps1
.EXAMPLE
    .\start.ps1 -NoBrowser -Port 3005
#>
[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [ValidateRange(0, 65535)][int]$Port = 0,
    [switch]$Seed
)
$PortExplicit = ($PSBoundParameters.ContainsKey('Port') -and $Port -gt 0)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location -LiteralPath $PSScriptRoot
$Root = (Get-Location).ProviderPath
. (Join-Path $Root 'scripts\dev-helpers.ps1')

$RunDir = Join-Path $Root '.run'
$PidFile = Join-Path $RunDir 'dev.pid'
$PortFile = Join-Path $RunDir 'dev.port'
$BaseUrlFile = Join-Path $RunDir 'dev.baseurl'
$LogFile = Join-Path $RunDir 'dev.log'
$ErrLogFile = Join-Path $RunDir 'dev.err.log'
$DockerTimeoutSec = 120
$FrontTimeoutSec = 90

function Get-PackageJson {
    return (Get-Content -LiteralPath (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json)
}

function Get-MinNodeVersion($Pkg) {
    $min = [version]'20.9.0'   # Next.js 16 exige Node >= 20.9
    if ($Pkg.PSObject.Properties['engines'] -and $Pkg.engines.PSObject.Properties['node']) {
        if ([string]$Pkg.engines.node -match '(\d+)(?:\.(\d+))?(?:\.(\d+))?') {
            $v = [version]("{0}.{1}.{2}" -f $Matches[1], ($(if ($Matches[2]) { $Matches[2] } else { 0 })), ($(if ($Matches[3]) { $Matches[3] } else { 0 })))
            if ($v -gt $min) { $min = $v }
        }
    }
    return $min
}

# Lê o valor de uma chave do .env.local (vazio se ausente).
function Get-EnvLocalValue([string]$Content, [string]$Key) {
    if ($Content -match "(?m)^\s*$Key\s*=\s*(.*?)\s*$") { return $Matches[1].Trim('"', "'") }
    return ''
}

function Get-FrontState([int]$TestPort) {
    # Retorna: 'free' | 'project' (este projeto já está servindo) | 'other' (outro processo)
    $pids = @(Get-PortListenerPids $TestPort)
    if ($pids.Count -eq 0) { return [pscustomobject]@{ State = 'free'; Pid = 0; Cmd = '' } }
    foreach ($p in $pids) {
        $info = Get-ProcessInfo $p
        if (Test-IsProjectNode $info $Root) { return [pscustomobject]@{ State = 'project'; Pid = $p; Cmd = [string]$info.CommandLine } }
    }
    $info = Get-ProcessInfo $pids[0]
    $cmd = if ($info) { "$($info.Name): $($info.CommandLine)" } else { '(processo desconhecido)' }
    return [pscustomobject]@{ State = 'other'; Pid = $pids[0]; Cmd = $cmd }
}

function Show-PortOwner([int]$P) {
    foreach ($procId in @(Get-PortListenerPids $P)) {
        $info = Get-ProcessInfo $procId
        if ($info) { Write-Info "Porta $P em uso por PID $procId ($($info.Name))" }
        else { Write-Info "Porta $P em uso por PID $procId" }
    }
}

try {
    Write-Host "QR Code Manager - iniciando ambiente local" -ForegroundColor White

    # ---------------------------------------------------------------- 1. Pré-requisitos
    Write-Step "Verificando pré-requisitos"
    $pkg = Get-PackageJson

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Stop-WithError "Node.js não encontrado. Instale o Node 20 LTS ou mais novo: https://nodejs.org/ (ou: winget install OpenJS.NodeJS.LTS) e abra um novo terminal."
    }
    $nodeRaw = (Invoke-Native -FilePath 'node' -ArgumentList @('--version')).Text.Trim()
    $minNode = Get-MinNodeVersion $pkg
    $nodeVer = $null
    if ($nodeRaw -match 'v?(\d+\.\d+\.\d+)') { $nodeVer = [version]$Matches[1] }
    if (-not $nodeVer -or $nodeVer -lt $minNode) {
        Stop-WithError "Node $nodeRaw é antigo demais (mínimo $minNode). Atualize: https://nodejs.org/ (ou: winget upgrade OpenJS.NodeJS.LTS)."
    }
    Write-Ok "Node $nodeRaw (mínimo $minNode)"

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Stop-WithError "npm não encontrado. Ele vem junto com o Node.js: reinstale pelo https://nodejs.org/"
    }
    $npmVer = (Invoke-Native -FilePath 'npm' -ArgumentList @('--version')).Text.Trim()
    Write-Ok "npm $npmVer"

    if (-not (Resolve-DockerCli)) {
        Stop-WithError "Docker CLI não encontrado. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/ (ou: winget install Docker.DockerDesktop)."
    }
    $dockerVer = (Invoke-Native -FilePath 'docker' -ArgumentList @('--version')).Text.Trim()
    Write-Ok $dockerVer


    # Estado atual do front (antes de mexer em node_modules)
    $frontRunning = (@(Get-ProjectNextDevProcesses $Root).Count -gt 0)

    # ---------------------------------------------------------------- 2. Docker Desktop
    Write-Step "Verificando o Docker"
    if (Test-DockerRunning) {
        Write-Ok "Docker está rodando"
    } else {
        $exe = Find-DockerDesktopExe
        if (-not $exe) {
            Stop-WithError "O Docker não está rodando e o Docker Desktop não foi encontrado. Instale/abra o Docker Desktop: https://www.docker.com/products/docker-desktop/"
        }
        Write-Info "Docker não está respondendo. Abrindo o Docker Desktop: $exe"
        Start-Process -FilePath $exe | Out-Null
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $ready = $false
        while ($sw.Elapsed.TotalSeconds -lt $DockerTimeoutSec) {
            Start-Sleep -Seconds 3
            if (Test-DockerRunning) { $ready = $true; break }
            Write-Info ("aguardando o Docker iniciar... {0}s/{1}s" -f [int]$sw.Elapsed.TotalSeconds, $DockerTimeoutSec)
        }
        if (-not $ready) {
            Stop-WithError "O Docker Desktop não respondeu em $DockerTimeoutSec s. Abra o Docker Desktop manualmente, espere ficar 'Engine running' e rode .\start.ps1 de novo."
        }
        Write-Ok ("Docker iniciado em {0}s" -f [int]$sw.Elapsed.TotalSeconds)
    }
    if (-not (Test-DockerCompose)) {
        Stop-WithError "O 'docker compose' não está disponível. Atualize o Docker Desktop: https://www.docker.com/products/docker-desktop/"
    }
    Write-Ok "docker compose disponível"

    # ---------------------------------------------------------------- 3. Dependências
    Write-Step "Verificando dependências (node_modules)"
    $lock = Join-Path $Root 'package-lock.json'
    $nmLock = Join-Path $Root 'node_modules\.package-lock.json'
    $needInstall = $false
    if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules'))) {
        $needInstall = $true; Write-Info "node_modules não existe."
    } elseif ((Test-Path -LiteralPath $lock) -and (-not (Test-Path -LiteralPath $nmLock))) {
        $needInstall = $true; Write-Info "node_modules incompleto (sem .package-lock.json)."
    } elseif ((Test-Path -LiteralPath $lock) -and ((Get-Item -LiteralPath $lock).LastWriteTimeUtc -gt (Get-Item -LiteralPath $nmLock).LastWriteTimeUtc)) {
        $needInstall = $true; Write-Info "package-lock.json mudou desde a última instalação."
    }
    if ($needInstall) {
        if ($frontRunning) {
            Write-Aviso "As dependências estão desatualizadas, mas o front está rodando e travaria os arquivos. Rode .\stop.ps1 e depois .\start.ps1 para atualizar."
        } else {
            $installArgs = if (Test-Path -LiteralPath $lock) { @('ci') } else { @('install') }
            Write-Info "Executando: npm $($installArgs -join ' ') (pode demorar alguns minutos)"
            $r = Invoke-Native -FilePath 'npm' -ArgumentList $installArgs -Stream
            if ($r.ExitCode -ne 0) { Stop-WithError "npm $($installArgs -join ' ') falhou (código $($r.ExitCode)). Veja a saída acima." }
            Write-Ok "Dependências instaladas"
        }
    } else {
        Write-Ok "Dependências em dia"
    }

    # ---------------------------------------------------------------- 4. .env.local
    Write-Step "Verificando .env.local"
    $envLocal = Join-Path $Root '.env.local'
    # Senha do Postgres local: variável de ambiente POSTGRES_PASSWORD; senão a do .env.local; senão gera uma.
    $envLocalContent = if (Test-Path -LiteralPath $envLocal) { Get-Content -LiteralPath $envLocal -Raw } else { '' }
    if ($null -eq $envLocalContent) { $envLocalContent = '' }
    $pgPassword = $env:POSTGRES_PASSWORD
    if (-not $pgPassword) { $pgPassword = Get-EnvLocalValue $envLocalContent 'POSTGRES_PASSWORD' }
    if (-not $pgPassword) { $pgPassword = New-RandomSecret }
    $env:POSTGRES_PASSWORD = $pgPassword   # o docker compose lê daqui
    $defaultDbUrl = "postgres://postgres:$([uri]::EscapeDataString($pgPassword))@127.0.0.1:54422/qrcode"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    if (Test-Path -LiteralPath $envLocal) {
        $content = $envLocalContent
        $added = New-Object System.Collections.Generic.List[string]
        $append = ''
        if ((Get-EnvLocalValue $content 'POSTGRES_PASSWORD') -eq '') {
            $append += "POSTGRES_PASSWORD=$pgPassword`r`n"; $added.Add('POSTGRES_PASSWORD')
        }
        if ((Get-EnvLocalValue $content 'DATABASE_URL') -eq '') {
            $append += "DATABASE_URL=$defaultDbUrl`r`n"; $added.Add('DATABASE_URL')
        }
        if ((Get-EnvLocalValue $content 'SESSION_SECRET').Length -lt 32) {
            $append += "SESSION_SECRET=$(New-RandomSecret)`r`n"; $added.Add('SESSION_SECRET')
        }
        if ($append -ne '') {
            $sep = if ($content -ne '' -and -not $content.EndsWith("`n")) { "`r`n" } else { '' }
            [System.IO.File]::AppendAllText($envLocal, ($sep + $append), $utf8NoBom)
            Write-Ok ".env.local já existia; acrescentei no final: $($added -join ', ') (demais linhas intactas)"
        } else {
            Write-Ok ".env.local já existe e está completo (não foi alterado)"
        }
        $old = @('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'AUTH_EMAIL_DOMAIN') |
            Where-Object { (Get-EnvLocalValue $content $_) -ne '' }
        if (@($old).Count -gt 0) {
            Write-Aviso "O .env.local tem chaves antigas que não são mais usadas ($(@($old) -join ', ')). Pode apagá-las; não mexi nelas."
        }
    } else {
        $values = [ordered]@{
            'POSTGRES_PASSWORD' = $pgPassword
            'DATABASE_URL'   = $defaultDbUrl
            'SESSION_SECRET' = (New-RandomSecret)
        }
        $example = Join-Path $Root '.env.example'
        $lines = if (Test-Path -LiteralPath $example) { @(Get-Content -LiteralPath $example) } else { @('NEXT_PUBLIC_BASE_URL=http://localhost:3000') }
        $seen = @{}
        $out = foreach ($line in $lines) {
            if ($line -match '^\s*([A-Z0-9_]+)\s*=' -and $values.Contains($Matches[1])) {
                $seen[$Matches[1]] = $true
                "$($Matches[1])=$($values[$Matches[1]])"
            } else { $line }
        }
        foreach ($k in $values.Keys) { if (-not $seen.ContainsKey($k)) { $out = @($out) + "$k=$($values[$k])" } }
        [System.IO.File]::WriteAllText($envLocal, ((@($out) -join "`r`n") + "`r`n"), $utf8NoBom)
        Write-Ok ".env.local criado a partir de .env.example (POSTGRES_PASSWORD, DATABASE_URL e SESSION_SECRET gerados)"
    }

    # ---------------------------------------------------------------- 5. Banco (Postgres em 1 container)
    Write-Step "Subindo o Postgres local (container $DbContainer)"
    $legacy = Get-LegacySupabaseContainers
    if ($legacy.Count -gt 0) {
        Stop-WithError ("O Supabase local ANTIGO deste projeto ainda está rodando ($($legacy.Count) containers) e ocupa a porta $DbPort.`n  Pare-o (os dados são preservados): .\stop.ps1`n  ou: docker stop `$(docker ps -q --filter `"label=com.supabase.cli.project=qrcode-manager`")")
    }
    $volCheck = Invoke-Native -FilePath 'docker' -ArgumentList @('volume', 'inspect', $DbVolume)
    $dbVolumeExisted = ($volCheck.ExitCode -eq 0)
    $health = Invoke-Native -FilePath 'docker' -ArgumentList @('inspect', '-f', '{{.State.Health.Status}}', $DbContainer)
    $alreadyHealthy = ($health.ExitCode -eq 0 -and $health.Text.Trim() -eq 'healthy')

    if ($alreadyHealthy) {
        Write-Ok "O container $DbContainer já está rodando e saudável"
    } else {
        if (-not $dbVolumeExisted) {
            Write-Info "Primeiro start: o banco será criado (pode baixar a imagem postgres:17-alpine e demorar)."
        }
        $r = Invoke-Native -FilePath 'docker' -ArgumentList @('compose', 'up', '-d', '--wait', '--wait-timeout', '120') -Stream
        if ($r.ExitCode -ne 0) {
            if ($r.Text -match '(?i)port is already allocated|address already in use|ports are not available|only one usage of each socket address|bind:') {
                Write-Host ""
                Show-PortOwner $DbPort
                Stop-WithError "A porta $DbPort está ocupada; feche o programa que a usa ou altere a porta em docker-compose.yml E no DATABASE_URL do .env.local."
            }
            Stop-WithError "docker compose up falhou (código $($r.ExitCode)). Veja a saída acima."
        }
        Write-Ok "Postgres rodando e saudável"
    }
    $projContainers = Get-ProjectContainers
    if ($projContainers.Count -ne 1) {
        Write-Aviso "Esperava exatamente 1 container do projeto, mas há $($projContainers.Count): $(@($projContainers.Values) -join ', ')"
    } else {
        Write-Ok "Exatamente 1 container do projeto: $(@($projContainers.Values)[0])"
    }

    # ---------------------------------------------------------------- 6. Migrações
    Write-Step "Aplicando migrações"
    $r = Invoke-Native -FilePath 'node' -ArgumentList @('--env-file=.env.local', 'scripts/migrate.mjs') -Stream
    if ($r.ExitCode -ne 0) { Stop-WithError "As migrações falharam (código $($r.ExitCode)). Veja a saída acima." }
    Write-Ok "Migrações em dia"

    # ---------------------------------------------------------------- 7. Usuários de teste
    Write-Step "Verificando usuários de teste"
    $count = -1
    $q = Invoke-Native -FilePath 'docker' -ArgumentList @('exec', $DbContainer, 'psql', '-U', 'postgres', '-d', 'qrcode', '-tAc', 'select count(*) from public.users')
    if ($q.ExitCode -eq 0 -and $q.Text.Trim() -match '^\d+$') { $count = [int]$q.Text.Trim() }
    if ($Seed -or -not $dbVolumeExisted -or $count -le 0) {
        $why = if ($Seed) { 'forçado com -Seed' } elseif (-not $dbVolumeExisted) { 'banco recém-criado' } elseif ($count -eq 0) { 'nenhum usuário no banco' } else { 'não foi possível contar os usuários' }
        Write-Info "Rodando o seed de usuários ($why)..."
        $r = Invoke-Native -FilePath 'node' -ArgumentList @('--env-file=.env.local', 'scripts/seed-users.mjs') -Stream
        if ($r.ExitCode -ne 0) { Stop-WithError "O seed de usuários falhou (código $($r.ExitCode)). Veja a saída acima." }
        Write-Ok "Usuários de teste prontos (veja scripts/seed-users.mjs)"
    } else {
        Write-Ok "$count usuário(s) já existem no banco; seed não necessário (use -Seed para forçar)"
    }

    # ---------------------------------------------------------------- 8. Front (Next.js) e porta
    Write-Step "Front (Next.js)"
    if (-not (Test-Path -LiteralPath $RunDir)) { New-Item -ItemType Directory -Path $RunDir | Out-Null }

    $savedPort = 0
    if (Test-Path -LiteralPath $PortFile) {
        [void][int]::TryParse(((Get-Content -LiteralPath $PortFile -Raw) -as [string]).Trim(), [ref]$savedPort)
    }
    $front = $null
    $reuse = $false
    if ($savedPort -gt 0) {
        $f = Get-FrontState $savedPort
        if ($f.State -eq 'project') {
            $reuse = $true; $front = $f
            if ($PortExplicit -and $Port -ne $savedPort) {
                Write-Aviso "O front já roda na porta $savedPort; rode .\stop.ps1 para trocar de porta. Seguindo com $savedPort."
            }
            $Port = $savedPort
        }
    }
    if (-not $reuse) {
        $candidate = if ($PortExplicit) { $Port } else { 3000 }
        $f = Get-FrontState $candidate
        if ($f.State -eq 'free') {
            $Port = $candidate
        } elseif ($f.State -eq 'project') {
            $Port = $candidate; $reuse = $true; $front = $f
        } elseif ($PortExplicit) {
            Stop-WithError ("A porta $candidate já está em uso por outro programa que NÃO é este projeto (PID $($f.Pid)):`n    $($f.Cmd)`n  Feche esse programa ou use outra porta: .\start.ps1 -Port 3001`n  (O banco continua rodando; .\stop.ps1 para tudo.)")
        } else {
            $free = Find-FreePort 3001 3020
            if ($free -eq 0) { Stop-WithError "A porta 3000 está em uso por outro programa e não achei porta livre entre 3001 e 3020." }
            Write-Aviso "A porta 3000 está em uso por outro programa ($($f.Cmd)). Usando a porta $free."
            $Port = $free
        }
    }

    # URL base: a do .env.local se for pública (ex.: túnel https); senão, a porta real.
    $localBasePattern = '^https?://(localhost|127\.0\.0\.1)(:\d+)?/?$'
    $envBase = Get-EnvLocalValue (Get-Content -LiteralPath $envLocal -Raw) 'NEXT_PUBLIC_BASE_URL'
    $BaseUrl = "http://localhost:$Port"
    if ($envBase -eq '' -or $envBase -match $localBasePattern) {
        $EffectiveBaseUrl = $BaseUrl
    } else {
        $EffectiveBaseUrl = $envBase.TrimEnd('/')
        Write-Aviso "NEXT_PUBLIC_BASE_URL no .env.local aponta para $EffectiveBaseUrl; mantive esse valor nos links/QR (o painel abre em $BaseUrl)."
    }

    $prevBase = ''
    if (Test-Path -LiteralPath $BaseUrlFile) { $prevBase = ((Get-Content -LiteralPath $BaseUrlFile -Raw) -as [string]).Trim() }

    $startedNow = $false
    if ($reuse) {
        Write-Ok "O front deste projeto já está rodando na porta $Port (PID $($front.Pid)); não vou subir outro."
        if (-not (Test-Path -LiteralPath $PidFile)) { Set-Content -LiteralPath $PidFile -Value $front.Pid -Encoding ASCII }
        if (-not (Test-Path -LiteralPath $PortFile)) { Set-Content -LiteralPath $PortFile -Value $Port -Encoding ASCII }
        if ($prevBase -ne '' -and $prevBase -ne $EffectiveBaseUrl) {
            Write-Aviso "O front em execução usa a URL base $prevBase, diferente da atual ($EffectiveBaseUrl). Rode .\stop.ps1 e depois .\start.ps1 para aplicar."
        }
    } else {
        # PID antigo de uma execução anterior que morreu?
        if (Test-Path -LiteralPath $PidFile) {
            $oldPid = 0
            [void][int]::TryParse(((Get-Content -LiteralPath $PidFile -Raw) -as [string]).Trim(), [ref]$oldPid)
            if ($oldPid -gt 0 -and (Test-IsProjectNode (Get-ProcessInfo $oldPid) $Root -AllowCmd)) {
                Write-Aviso "Processo antigo do front (PID $oldPid) ainda existe mas não responde; encerrando."
                [void](Stop-ProcessTree $oldPid)
            }
            Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        }
        $nextBin = Join-Path $Root 'node_modules\next\dist\bin\next'
        if (-not (Test-Path -LiteralPath $nextBin)) { Stop-WithError "Next.js não encontrado em node_modules. Rode 'npm ci'." }
        $nodeExe = (Get-Command node).Source
        foreach ($f in @($LogFile, $ErrLogFile)) {
            try { if (Test-Path -LiteralPath $f) { Remove-Item -LiteralPath $f -Force } }
            catch { Stop-WithError "Não consegui apagar $f (está em uso por outro processo?). Rode .\stop.ps1 e tente de novo." }
        }
        # NEXT_PUBLIC_BASE_URL é embutida no bundle: se a URL mudou desde a última execução
        # (troca de porta), apaga o cache do Next para não servir bundle com a URL antiga.
        $nextCache = Join-Path $Root '.next'
        if ($prevBase -ne '' -and $prevBase -ne $EffectiveBaseUrl -and (Test-Path -LiteralPath $nextCache)) {
            Write-Info "A URL base mudou ($prevBase -> $EffectiveBaseUrl): apagando o cache .next."
            try { Remove-Item -LiteralPath $nextCache -Recurse -Force }
            catch { Write-Aviso "Não consegui apagar .next: $($_.Exception.Message)" }
        }
        # Cria o processo via WMI (Win32_Process.Create) em vez de Start-Process: assim ele
        # NÃO herda os handles deste terminal (com Start-Process -Redirect*, quem lê a saída
        # deste script por pipe ficaria travado esperando o next dev terminar) e continua
        # rodando mesmo se esta janela for fechada. O cmd.exe faz o redirecionamento dos logs.
        # O WMI também NÃO herda $env: deste PowerShell; por isso NEXT_PUBLIC_BASE_URL vai
        # dentro do cmd.exe (sem espaço antes de &&, senão o valor ganha um espaço no fim).
        $cmdLine = "cmd.exe /d /c `"set `"NEXT_PUBLIC_BASE_URL=$EffectiveBaseUrl`"&& `"$nodeExe`" `"$nextBin`" dev --port $Port 1>`"$LogFile`" 2>`"$ErrLogFile`"`""
        $startup = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
        $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine               = $cmdLine
            CurrentDirectory          = $Root
            ProcessStartupInformation = $startup
        }
        if ($res.ReturnValue -ne 0 -or -not $res.ProcessId) {
            Stop-WithError "Não foi possível iniciar o next dev (Win32_Process.Create retornou $($res.ReturnValue))."
        }
        $frontPid = [int]$res.ProcessId
        Set-Content -LiteralPath $PidFile -Value $frontPid -Encoding ASCII
        Set-Content -LiteralPath $PortFile -Value $Port -Encoding ASCII
        Set-Content -LiteralPath $BaseUrlFile -Value $EffectiveBaseUrl -Encoding ASCII
        $startedNow = $true
        Write-Info "next dev iniciado em segundo plano (PID $frontPid) na porta $Port. Aguardando http://localhost:$Port/login ..."
    }

    # Espera o /login responder 200
    $url = "http://localhost:$Port/login"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $ok = $false; $lastStatus = ''
    while ($sw.Elapsed.TotalSeconds -lt $FrontTimeoutSec) {
        try {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 0
            $lastStatus = [string][int]$resp.StatusCode
            if ($resp.StatusCode -eq 200) { $ok = $true; break }
        } catch {
            $lastStatus = $_.Exception.Message
            if ($_.Exception.PSObject.Properties['Response'] -and $_.Exception.Response) {
                try { $lastStatus = "HTTP " + [int]$_.Exception.Response.StatusCode } catch { }
            }
        }
        if ($startedNow -and -not (Get-Process -Id $frontPid -ErrorAction SilentlyContinue)) {
            $tail = ''
            foreach ($f in @($ErrLogFile, $LogFile)) {
                if (-not $tail -and (Test-Path -LiteralPath $f)) { $tail = (@(Get-Content -LiteralPath $f -Tail 15) -join "`n    ") }
            }
            Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
            Stop-WithError "O next dev encerrou logo após iniciar. Últimas linhas do log (.run\dev.err.log / .run\dev.log):`n    $tail"
        }
        Start-Sleep -Seconds 2
        Write-Info ("aguardando o front responder... {0}s/{1}s" -f [int]$sw.Elapsed.TotalSeconds, $FrontTimeoutSec)
    }
    if (-not $ok) {
        Stop-WithError "O front não respondeu 200 em $url dentro de $FrontTimeoutSec s (último resultado: $lastStatus). Veja .run\dev.log e .run\dev.err.log. O processo continua rodando; .\stop.ps1 encerra."
    }
    Write-Ok "Front respondendo: $url (HTTP 200)"

    if (-not $NoBrowser) { Start-Process $url | Out-Null }

    # ---------------------------------------------------------------- Resumo
    Write-Host ""
    Write-Host "Tudo pronto!" -ForegroundColor Green
    Write-Host "  Painel:          http://localhost:$Port/login"
    Write-Host "  Links/QR usam:   $EffectiveBaseUrl"
    Write-Host "  Banco:           postgres://postgres:***@127.0.0.1:$DbPort/qrcode (container $DbContainer)"
    Write-Host "  Usuários teste:  veja scripts/seed-users.mjs"
    Write-Host "  Logs do front:   .run\dev.log e .run\dev.err.log"
    Write-Host "  Para parar tudo: .\stop.ps1"
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
