# Script de Setup do Supabase CLI - Tasca do Vereda (PowerShell)
# Uso: .\scripts\supabase-setup.ps1 [init|start|stop|status|push|seed]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("init", "start", "stop", "status", "push", "seed", "types", "deploy", "reset", "help")]
    [string]$Command = "help"
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

function Test-Docker {
    try {
        $null = Get-Command docker -ErrorAction Stop
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Desktop não está rodando"
        }
        return $true
    }
    catch {
        return $false
    }
}

function Test-SupabaseCLI {
    try {
        $null = Get-Command npx -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Initialize-Project {
    Log-Info "Inicializando projeto Supabase..."
    
    if (-not (Test-SupabaseCLI)) {
        Log-Error "Node.js/NPX não encontrado. Instale Node.js primeiro."
        exit 1
    }
    
    # Verificar se já foi inicializado
    if (Test-Path "supabase\config.toml") {
        Log-Warning "Projeto já inicializado."
        return
    }
    
    try {
        npx supabase init
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Projeto inicializado com sucesso!"
            
            Log-Info "Fazendo link com projeto remoto..."
            npx supabase link --project-ref tboiuiwlqfzcvakxrsmj
            
            if ($LASTEXITCODE -eq 0) {
                Log-Success "Projeto linkado com sucesso!"
            } else {
                Log-Error "Falha ao fazer link do projeto."
                exit 1
            }
        } else {
            Log-Error "Falha ao inicializar projeto."
            exit 1
        }
    }
    catch {
        Log-Error "Erro durante inicialização: $($_.Exception.Message)"
        exit 1
    }
}

function Start-Services {
    Log-Info "Iniciando serviços Supabase..."
    
    if (-not (Test-Docker)) {
        Log-Error "Docker Desktop não está rodando. Inicie o Docker Desktop."
        Write-ColorOutput "📖 Documentação: https://docs.docker.com/desktop/" "Yellow"
        exit 1
    }
    
    try {
        npx supabase start
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Serviços iniciados com sucesso!"
            Write-Host ""
            Write-ColorOutput "🌐 Acessos locais:" "Blue"
            Write-Host "   Studio: http://localhost:54323"
            Write-Host "   API: http://localhost:54321"
            Write-Host "   Database: postgresql://postgres:postgres@localhost:54322/postgres"
            Write-Host ""
        } else {
            Log-Error "Falha ao iniciar serviços."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao iniciar serviços: $($_.Exception.Message)"
        exit 1
    }
}

function Stop-Services {
    Log-Info "Parando serviços Supabase..."
    
    try {
        npx supabase stop
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Serviços parados com sucesso!"
        } else {
            Log-Error "Falha ao parar serviços."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao parar serviços: $($_.Exception.Message)"
        exit 1
    }
}

function Check-Status {
    Log-Info "Verificando status dos serviços..."
    
    try {
        npx supabase status
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Status verificado com sucesso!"
        } else {
            Log-Error "Falha ao verificar status."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao verificar status: $($_.Exception.Message)"
        exit 1
    }
}

function Push-Schema {
    Log-Info "Fazendo push do schema para o Supabase..."
    
    try {
        npx supabase db push
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Schema enviado com sucesso!"
        } else {
            Log-Error "Falha ao enviar schema."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao enviar schema: $($_.Exception.Message)"
        exit 1
    }
}

function Seed-Database {
    Log-Info "Populando banco de dados..."
    
    try {
        npx supabase db seed
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Banco de dados populado com sucesso!"
        } else {
            Log-Error "Falha ao popular banco de dados."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao popular banco: $($_.Exception.Message)"
        exit 1
    }
}

function Generate-Types {
    Log-Info "Gerando tipos TypeScript..."
    
    try {
        if (-not (Test-Path "types")) {
            New-Item -ItemType Directory -Path "types" -Force | Out-Null
        }
        
        npx supabase gen types typescript > types/supabase.ts
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Tipos gerados com sucesso!"
        } else {
            Log-Error "Falha ao gerar tipos."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao gerar tipos: $($_.Exception.Message)"
        exit 1
    }
}

function Deploy-Functions {
    Log-Info "Deploy das Edge Functions..."
    
    try {
        npx supabase functions deploy
        
        if ($LASTEXITCODE -eq 0) {
            Log-Success "Functions deployadas com sucesso!"
        } else {
            Log-Error "Falha ao deploy functions."
            exit 1
        }
    }
    catch {
        Log-Error "Erro ao deploy functions: $($_.Exception.Message)"
        exit 1
    }
}

function Reset-Database {
    Log-Warning "⚠️  Isso vai resetar todo o banco de dados local!"
    
    $response = Read-Host "Tem certeza? (y/N)" -Prompt "Continuar"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Log-Info "Resetando banco de dados..."
        
        try {
            npx supabase db reset
            
            if ($LASTEXITCODE -eq 0) {
                Log-Success "Banco resetado com sucesso!"
            } else {
                Log-Error "Falha ao resetar banco."
                exit 1
            }
        }
        catch {
            Log-Error "Erro ao resetar banco: $($_.Exception.Message)"
            exit 1
        }
    } else {
        Log-Info "Operação cancelada."
    }
}

function Show-Help {
    Write-Host "Uso: .\scripts\supabase-setup.ps1 [comando]"
    Write-Host ""
    Write-Host "Comandos disponíveis:"
    Write-Host "  init     - Inicializa projeto e faz link"
    Write-Host "  start    - Inicia serviços locais"
    Write-Host "  stop     - Para serviços locais"
    Write-Host "  status   - Verifica status"
    Write-Host "  push     - Envia schema para remoto"
    Write-Host "  seed     - Popula banco com dados iniciais"
    Write-Host "  types    - Gera tipos TypeScript"
    Write-Host "  deploy   - Deploy das Edge Functions"
    Write-Host "  reset    - Reseta banco local"
    Write-Host "  help     - Mostra esta ajuda"
    Write-Host ""
    Write-Host "Exemplos:"
    Write-Host "  .\scripts\supabase-setup.ps1 init      # Primeiro setup"
    Write-Host "  .\scripts\supabase-setup.ps1 start     # Iniciar desenvolvimento"
    Write-Host "  .\scripts\supabase-setup.ps1 push      # Enviar mudanças"
    Write-Host "  .\scripts\supabase-setup.ps1 types     # Gerar types"
}

# Main script logic
switch ($Command) {
    "init" {
        Initialize-Project
    }
    "start" {
        Start-Services
    }
    "stop" {
        Stop-Services
    }
    "status" {
        Check-Status
    }
    "push" {
        Push-Schema
    }
    "seed" {
        Seed-Database
    }
    "types" {
        Generate-Types
    }
    "deploy" {
        Deploy-Functions
    }
    "reset" {
        Reset-Database
    }
    "help" {
        Show-Help
    }
    default {
        Log-Error "Comando inválido: $Command"
        Show-Help
        exit 1
    }
}

Log-Info "Operação concluída!"
