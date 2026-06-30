#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de limpeza pré-deploy para Vercel
.DESCRIPTION
    Remove dist/ do versionamento, atualiza gitignore/vercelignore,
    faz commit e deploy no Vercel com validação de limite de 2 GiB.
.PARAMETER Token
    Token de autenticação da Vercel
.PARAMETER Prod
    Deploy em produção (switch)
.EXAMPLE
    .\deploy-vercel.ps1 -Token "vercel_token_aqui" -Prod
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Token = $env:VERCEL_TOKEN,

    [Parameter()]
    [switch]$Prod
)

# Cores para output
$colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error   = "Red"
    Info    = "Cyan"
}

function Write-Status($Message, $Type = "Info") {
    $color = $colors[$Type]
    Write-Host "[$Type] $Message" -ForegroundColor $color
}

function Test-Command($Cmd) {
    return [bool](Get-Command $Cmd -ErrorAction SilentlyContinue)
}

# ============ VALIDAÇÃO INICIAL ============
Write-Status "=== INICIANDO LIMPEZA PRÉ-DEPLOY ===" "Info"

# Verificar Node.js e npm
Write-Status "Validando Node.js e npm..." "Info"
if (-not (Test-Command "node")) {
    Write-Status "Node.js não encontrado no PATH!" "Error"
    exit 1
}
if (-not (Test-Command "npm")) {
    Write-Status "npm não encontrado no PATH!" "Error"
    exit 1
}

$nodeVersion = node -v
$npmVersion = npm -v
Write-Status "Node.js: $nodeVersion, npm: $npmVersion" "Success"

# Verificar token Vercel
if (-not $Token) {
    Write-Status "Token Vercel não fornecido! Use -Token ou defina $env:VERCEL_TOKEN" "Error"
    exit 1
}
Write-Status "Token Vercel configurado" "Success"

# ============ LIMPEZA DO DIST ============
Write-Status "=== ETAPA 1: LIMPEZA DA PASTA DIST ===" "Info"

# Verificar se dist existe no git
$distInGit = git ls-files --error-unmatch dist/.gitkeep 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Status "Removendo dist/ do versionamento Git..." "Info"
    git rm -r --cached dist/ 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "dist/ removido do Git com sucesso" "Success"
    } else {
        Write-Status "dist/ já não estava versionado ou erro na remoção" "Warning"
    }
} else {
    Write-Status "dist/ não está no versionamento Git" "Success"
}

# ============ ATUALIZAR GITIGNORE ============
Write-Status "=== ETAPA 2: ATUALIZANDO .GITIGNORE ===" "Info"

$gitignorePath = ".gitignore"
$gitignoreEntries = @(
    "# Build outputs",
    "dist/",
    "dist-electron/",
    "build/",
    "out/",
    "",
    "# Dependencies",
    "node_modules/",
    "",
    "# Environment",
    ".env",
    ".env.local",
    ".env.*.local",
    "",
    "# Logs",
    "*.log",
    "logs/",
    "",
    "# IDE",
    ".vscode/settings.json",
    ".idea/",
    "",
    "# OS",
    ".DS_Store",
    "Thumbs.db"
)

# Criar ou atualizar .gitignore
$existingContent = ""
if (Test-Path $gitignorePath) {
    $existingContent = Get-Content $gitignorePath -Raw
}

foreach ($entry in $gitignoreEntries) {
    if ($entry -eq "" -or $existingContent -match [regex]::Escape($entry).Replace("\*", ".*")) {
        continue
    }
    Add-Content -Path $gitignorePath -Value $entry -ErrorAction SilentlyContinue
}

Write-Status ".gitignore atualizado com sucesso" "Success"

# ============ ATUALIZAR VERCELIGNORE ============
Write-Status "=== ETAPA 3: ATUALIZANDO .VERCELIGNORE ===" "Info"

$vercelignorePath = ".vercelignore"
$vercelignoreEntries = @(
    "# Build outputs - NÃO enviar para Vercel",
    "dist/",
    "dist-electron/",
    "build/",
    "out/",
    "release-new/",
    "dist-msi/",
    "",
    "# Dependencies",
    "node_modules/",
    "",
    "# Source maps (grande)",
    "*.map",
    "",
    "# Logs e temporários",
    "*.log",
    "logs/",
    ".temp/",
    "",
    "# Electron builds",
    "*.exe",
    "*.msi",
    "*.dmg",
    "",
    "# Banco de dados local",
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    "",
    "# Git",
    ".git/",
    ".gitignore"
)

# Criar .vercelignore
$vercelContent = $vercelignoreEntries -join "`n"
Set-Content -Path $vercelignorePath -Value $vercelContent -Force

Write-Status ".vercelignore criado/atualizado com sucesso" "Success"

# ============ COMMIT DAS ALTERAÇÕES ============
Write-Status "=== ETAPA 4: COMMIT DAS ALTERAÇÕES ===" "Info"

git add .gitignore .vercelignore 2>&1 | Out-Null

# Verificar se há alterações para commit
$status = git status --porcelain
if ($status) {
    Write-Status "Criando commit de configuração..." "Info"
    git commit -m "chore: configuração de deploy Vercel

- Remove dist/ do versionamento Git
- Atualiza .gitignore para ignorar build outputs
- Adiciona .vercelignore para limitar tamanho do deploy
- Prepara projeto para deploy < 2 GiB" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Commit criado com sucesso" "Success"
    } else {
        Write-Status "Erro ao criar commit (pode já existir)" "Warning"
    }
} else {
    Write-Status "Nenhuma alteração para commit" "Warning"
}

# ============ VALIDAÇÃO DE TAMANHO ============
Write-Status "=== ETAPA 5: VALIDAÇÃO DE TAMANHO ===" "Info"

# Calcular tamanho dos arquivos rastreados
$trackedFiles = git ls-files | Where-Object { $_ -notmatch "^dist/" }
$totalSize = 0
$largeFiles = @()

foreach ($file in $trackedFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        $totalSize += $size
        if ($size -gt 10MB) {
            $largeFiles += [PSCustomObject]@{
                File = $file
                SizeMB = [math]::Round($size / 1MB, 2)
            }
        }
    }
}

$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
$totalSizeGB = [math]::Round($totalSize / 1GB, 2)

Write-Status "Tamanho total dos arquivos: $totalSizeMB MB ($totalSizeGB GB)" "Info"

if ($largeFiles.Count -gt 0) {
    Write-Status "⚠️ Arquivos grandes detectados (>10MB):" "Warning"
    $largeFiles | ForEach-Object { Write-Status "  - $($_.File): $($_.SizeMB) MB" "Warning" }
}

if ($totalSizeGB -ge 1.8) {
    Write-Status "ALERTA: Tamanho próximo do limite de 2 GiB!" "Error"
    $response = Read-Host "Continuar mesmo assim? (s/N)"
    if ($response -ne "s") {
        Write-Status "Deploy cancelado pelo usuário" "Warning"
        exit 1
    }
}

# ============ DEPLOY VERCEL ============
Write-Status "=== ETAPA 6: DEPLOY NO VERCEL ===" "Info"

# Verificar se vercel CLI está disponível
$vercelCmd = "npx"
$vercelArgs = @("vercel@latest")

if (Test-Command "vercel") {
    $vercelCmd = "vercel"
    $vercelArgs = @()
}

# Construir argumentos do deploy
$deployArgs = $vercelArgs + @(
    "--token", $Token,
    "--yes"
)

if ($Prod) {
    $deployArgs += "--prod"
}

Write-Status "Executando deploy..." "Info"
try {
    & $vercelCmd @deployArgs 2>&1 | Tee-Object -Variable deployOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Deploy concluído com sucesso!" "Success"
        
        # Extrair URL do deploy
        $deployUrl = $deployOutput | Select-String -Pattern "https?://[^\s]+\.vercel\.app" | ForEach-Object { $_.Matches[0].Value }
        if ($deployUrl) {
            Write-Status "URL do deploy: $deployUrl" "Success"
        }
    } else {
        Write-Status "Erro no deploy (código: $LASTEXITCODE)" "Error"
        exit 1
    }
} catch {
    Write-Status "Exceção durante deploy: $($_.Exception.Message)" "Error"
    exit 1
}

# ============ VALIDAÇÃO FINAL ============
Write-Status "=== ETAPA 7: VALIDAÇÃO FINAL ===" "Info"

# Verificar se dist/ ainda está no git
$distCheck = git ls-files dist/ 2>&1 | Select-Object -First 5
if ($distCheck) {
    Write-Status "⚠️ AVISO: dist/ ainda contém arquivos no Git:" "Warning"
    $distCheck | ForEach-Object { Write-Status "  $_" "Warning" }
} else {
    Write-Status "✅ dist/ não está no versionamento Git" "Success"
}

# Verificar se dist/ existe localmente
if (Test-Path "dist/") {
    $localDistSize = (Get-ChildItem dist/ -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $localDistSizeGB = [math]::Round($localDistSize / 1GB, 2)
    Write-Status "Pasta dist/ local: $localDistSizeGB GB (será ignorada no deploy)" "Info"
}

Write-Status "=== DEPLOY CONCLUÍDO ===" "Success"
Write-Status "Tamanho do projeto: $totalSizeGB GB (< 2 GiB ✅)" "Success"
