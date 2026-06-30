#!/bin/bash

echo "🔍 VERIFICANDO TABELAS DO SUPABASE VIA CLI"
echo "============================================================"
echo ""

# Data de hoje
TODAY=$(date +%Y-%m-%d)
echo "📅 Data de hoje: $TODAY"
echo ""

echo "1️⃣  Verificando tabela closed_days..."
supabase db execute --sql "SELECT * FROM closed_days ORDER BY date DESC LIMIT 10;"
echo ""

echo "2️⃣  Verificando tabela cash_flow (FECHO_CAIXA)..."
supabase db execute --sql "SELECT id, amount, description, created_at FROM cash_flow WHERE category = 'FECHO_CAIXA' ORDER BY created_at DESC LIMIT 10;"
echo ""

echo "3️⃣  Verificando dia de hoje em closed_days..."
supabase db execute --sql "SELECT * FROM closed_days WHERE date = '$TODAY';"
echo ""

echo "4️⃣  Verificando dia de hoje em cash_flow..."
supabase db execute --sql "SELECT id, amount, description, created_at FROM cash_flow WHERE category = 'FECHO_CAIXA' AND created_at >= '$TODAY 00:00:00' AND created_at <= '$TODAY 23:59:59';"
echo ""

echo "============================================================"
echo "✅ VERIFICAÇÃO CONCLUÍDA"
echo "============================================================"
