# Script de Deploy para Vercel - Tasca do Vereda (PowerShell)
# Uso: .\scripts\deploy.ps1 [production|preview]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("production", "preview")]
    [string]$Environment = "preview"
)

# Cores para output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Log-Info {
    param([string]$Message)
    Write-ColorOutput "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" "Blue"
}

function Log-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Log-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" "Yellow"
}

function Log-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
}

try {
    Log-Info "Iniciando deploy para Vercel ($Environment)..."

    # Verificar se está na branch correta
    $currentBranch = git branch --show-current
    if ($Environment -eq "production" -and $currentBranch -ne "main") {
        Log-Warning "Você não está na branch main. Deseja continuar? (y/N)"
        $response = Read-Host
        if ($response -ne "y" -and $response -ne "Y") {
            Log-Info "Deploy cancelado."
            exit 0
        }
    }

    # Verificar se há mudanças não commitadas
    $status = git status --porcelain
    if ($status) {
        Log-Warning "Existem mudanças não commitadas. Deseja continuar? (y/N)"
        $response = Read-Host
        if ($response -ne "y" -and $response -ne "Y") {
            Log-Info "Deploy cancelado."
            exit 0
        }
    }

    # Verificar variáveis de ambiente
    Log-Info "Verificando variáveis de ambiente..."
    if (-not $env:VITE_SUPABASE_URL -or -not $env:VITE_SUPABASE_ANON_KEY) {
        Log-Warning "Variáveis de ambiente do Supabase não encontradas localmente."
        Log-Info "Verifique no dashboard Vercel se estão configuradas."
    }

    # Verificar se o Vercel CLI está instalado
    try {
        vercel --version | Out-Null
    }
    catch {
        Log-Error "Vercel CLI não encontrado. Instale com: npm i -g vercel"
        exit 1
    }

    # Build do projeto
    Log-Info "Fazendo build do projeto..."
    $buildResult = npm run build:vercel
    
    if ($LASTEXITCODE -eq 0) {
        Log-Success "Build concluído com sucesso!"
    }
    else {
        Log-Error "Build falhou!"
        exit 1
    }

    # Deploy para Vercel
    Log-Info "Iniciando deploy para Vercel..."
    if ($Environment -eq "production") {
        vercel --prod
    }
    else {
        vercel
    }

    if ($LASTEXITCODE -eq 0) {
        Log-Success "Deploy concluído com sucesso!"
        
        # Tentar obter URL do deploy
        try {
            $deployInfo = vercel ls 2>$null | Select-Object -Skip 1 -First 1
            if ($deployInfo) {
                $deployUrl = ($deployInfo -split '\s+')[1]
                Log-Info "URL do deploy: $deployUrl"
                
                # Perguntar se deseja abrir no navegador
                Log-Info "Deseja abrir a URL no navegador? (Y/n)"
                $openResponse = Read-Host
                if ($openResponse -ne "n" -and $openResponse -ne "N") {
                    Start-Process $deployUrl
                }
            }
        }
        catch {
            Log-Info "Não foi possível obter a URL do deploy automaticamente."
        }
    }
    else {
        Log-Error "Deploy falhou!"
        exit 1
    }

    Log-Info "Processo de deploy finalizado!"
}
catch {
    Log-Error "Ocorreu um erro durante o deploy: $($_.Exception.Message)"
    exit 1
}
