#!/bin/bash

# Script de Deploy para Vercel - Tasca do Vereda
# Uso: ./scripts/deploy.sh [production|preview]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar argumentos
ENVIRONMENT=${1:-preview}
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "preview" ]]; then
    error "Ambiente inválido. Use: production ou preview"
    exit 1
fi

log "Iniciando deploy para Vercel ($ENVIRONMENT)..."

# Verificar se está na branch correta
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" ]]; then
    warning "Você não está na branch main. Deseja continuar? (y/N)"
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
        log "Deploy cancelado."
        exit 0
    fi
fi

# Verificar se há mudanças não commitadas
if ! git diff --quiet || ! git diff --cached --quiet; then
    warning "Existem mudanças não commitadas. Deseja continuar? (y/N)"
    read -r response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
        log "Deploy cancelado."
        exit 0
    fi
fi

# Verificar variáveis de ambiente
log "Verificando variáveis de ambiente..."
if [[ -z "$VITE_SUPABASE_URL" || -z "$VITE_SUPABASE_ANON_KEY" ]]; then
    warning "Variáveis de ambiente do Supabase não encontradas localmente."
    log "Verifique no dashboard Vercel se estão configuradas."
fi

# Build do projeto
log "Fazendo build do projeto..."
npm run build:vercel

if [[ $? -eq 0 ]]; then
    success "Build concluído com sucesso!"
else
    error "Build falhou!"
    exit 1
fi

# Deploy para Vercel
log "Iniciando deploy para Vercel..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    vercel --prod
else
    vercel
fi

if [[ $? -eq 0 ]]; then
    success "Deploy concluído com sucesso!"
    
    # Obter URL do deploy
    DEPLOY_URL=$(vercel ls --scope $VERCEL_ORG_ID 2>/dev/null | head -n 2 | tail -n 1 | awk '{print $2}' || echo "N/A")
    log "URL do deploy: $DEPLOY_URL"
    
    # Abrir no navegador (opcional)
    if command -v xdg-open > /dev/null; then
        log "Abrindo URL no navegador..."
        xdg-open "$DEPLOY_URL" 2>/dev/null || true
    elif command -v open > /dev/null; then
        log "Abrindo URL no navegador..."
        open "$DEPLOY_URL" 2>/dev/null || true
    fi
else
    error "Deploy falhou!"
    exit 1
fi

log "Processo de deploy finalizado!"
