Write-Host "🔍 VERIFICANDO TABELAS DO SUPABASE VIA CLI" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Data de hoje
$TODAY = Get-Date -Format "yyyy-MM-dd"
Write-Host "📅 Data de hoje: $TODAY" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣  Verificando tabela closed_days..." -ForegroundColor Cyan
supabase db execute --sql "SELECT * FROM closed_days ORDER BY date DESC LIMIT 10;"
Write-Host ""

Write-Host "2️⃣  Verificando tabela cash_flow (FECHO_CAIXA)..." -ForegroundColor Cyan
supabase db execute --sql "SELECT id, amount, description, created_at FROM cash_flow WHERE category = 'FECHO_CAIXA' ORDER BY created_at DESC LIMIT 10;"
Write-Host ""

Write-Host "3️⃣  Verificando dia de hoje em closed_days..." -ForegroundColor Cyan
supabase db execute --sql "SELECT * FROM closed_days WHERE date = '$TODAY';"
Write-Host ""

Write-Host "4️⃣  Verificando dia de hoje em cash_flow..." -ForegroundColor Cyan
supabase db execute --sql "SELECT id, amount, description, created_at FROM cash_flow WHERE category = 'FECHO_CAIXA' AND created_at >= '$TODAY 00:00:00' AND created_at <= '$TODAY 23:59:59';"
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ VERIFICAÇÃO CONCLUÍDA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
