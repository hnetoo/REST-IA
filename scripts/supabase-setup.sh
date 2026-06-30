#!/bin/bash

# Script de Setup do Supabase CLI - Tasca do Vereda
# Uso: ./scripts/supabase-setup.sh [init|start|stop|status|push|seed]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

function success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function error() {
    echo -e "${RED}❌ $1${NC}"
}

function check_docker() {
    if ! docker --version > /dev/null 2>&1; then
        error "Docker não está instalado. Instale Docker Desktop primeiro."
        echo "📖 Documentação: https://docs.docker.com/desktop/"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        error "Docker Desktop não está rodando. Inicie o Docker Desktop."
        exit 1
    fi
}

function check_supabase_cli() {
    if ! command -v npx > /dev/null 2>&1; then
        error "Node.js/NPX não encontrado. Instale Node.js primeiro."
        exit 1
    fi
}

function init_project() {
    log "Inicializando projeto Supabase..."
    
    check_supabase_cli
    
    # Verificar se já foi inicializado
    if [ -f "supabase/config.toml" ]; then
        warning "Projeto já inicializado."
        return
    fi
    
    npx supabase init
    success "Projeto inicializado com sucesso!"
    
    log "Fazendo link com projeto remoto..."
    npx supabase link --project-ref tboiuiwlqfzcvakxrsmj
    success "Projeto linkado com sucesso!"
}

function start_services() {
    log "Iniciando serviços Supabase..."
    
    check_docker
    
    npx supabase start
    
    if [ $? -eq 0 ]; then
        success "Serviços iniciados com sucesso!"
        echo ""
        echo "🌐 Acessos locais:"
        echo "   Studio: http://localhost:54323"
        echo "   API: http://localhost:54321"
        echo "   Database: postgresql://postgres:postgres@localhost:54322/postgres"
        echo ""
    else
        error "Falha ao iniciar serviços."
        exit 1
    fi
}

function stop_services() {
    log "Parando serviços Supabase..."
    
    npx supabase stop
    
    if [ $? -eq 0 ]; then
        success "Serviços parados com sucesso!"
    else
        error "Falha ao parar serviços."
        exit 1
    fi
}

function check_status() {
    log "Verificando status dos serviços..."
    
    npx supabase status
    
    if [ $? -eq 0 ]; then
        success "Status verificado com sucesso!"
    else
        error "Falha ao verificar status."
        exit 1
    fi
}

function push_schema() {
    log "Fazendo push do schema para o Supabase..."
    
    npx supabase db push
    
    if [ $? -eq 0 ]; then
        success "Schema enviado com sucesso!"
    else
        error "Falha ao enviar schema."
        exit 1
    fi
}

function seed_database() {
    log "Populando banco de dados..."
    
    npx supabase db seed
    
    if [ $? -eq 0 ]; then
        success "Banco de dados populado com sucesso!"
    else
        error "Falha ao popular banco de dados."
        exit 1
    fi
}

function generate_types() {
    log "Gerando tipos TypeScript..."
    
    mkdir -p types
    npx supabase gen types typescript > types/supabase.ts
    
    if [ $? -eq 0 ]; then
        success "Tipos gerados com sucesso!"
    else
        error "Falha ao gerar tipos."
        exit 1
    fi
}

function deploy_functions() {
    log "Deploy das Edge Functions..."
    
    npx supabase functions deploy
    
    if [ $? -eq 0 ]; then
        success "Functions deployadas com sucesso!"
    else
        error "Falha ao deploy functions."
        exit 1
    fi
}

function reset_database() {
    warning "⚠️  Isso vai resetar todo o banco de dados local!"
    read -p "Tem certeza? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Resetando banco de dados..."
        npx supabase db reset
        
        if [ $? -eq 0 ]; then
            success "Banco resetado com sucesso!"
        else
            error "Falha ao resetar banco."
            exit 1
        fi
    else
        log "Operação cancelada."
    fi
}

function show_help() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  init     - Inicializa projeto e faz link"
    echo "  start    - Inicia serviços locais"
    echo "  stop     - Para serviços locais"
    echo "  status   - Verifica status"
    echo "  push     - Envia schema para remoto"
    echo "  seed     - Popula banco com dados iniciais"
    echo "  types    - Gera tipos TypeScript"
    echo "  deploy   - Deploy das Edge Functions"
    echo "  reset    - Reseta banco local"
    echo "  help     - Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 init      # Primeiro setup"
    echo "  $0 start     # Iniciar desenvolvimento"
    echo "  $0 push      # Enviar mudanças"
    echo "  $0 types     # Gerar types"
}

# Main script logic
case "$1" in
    init)
        init_project
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    status)
        check_status
        ;;
    push)
        push_schema
        ;;
    seed)
        seed_database
        ;;
    types)
        generate_types
        ;;
    deploy)
        deploy_functions
        ;;
    reset)
        reset_database
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        error "Comando inválido: $1"
        show_help
        exit 1
        ;;
esac

log "Operação concluída!"
