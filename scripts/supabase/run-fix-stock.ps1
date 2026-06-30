# Script PowerShell para corrigir colunas de stock
# Executa migração automática no Supabase

$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.9qV0p7ADmXYOYcYRLejlTwihFIlIIOS2W_tOkZwuPkw"
$env:VITE_SUPABASE_URL = "https://tboiuiwlqfzcvakxrsmj.supabase.co"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 CORREÇÃO: Colunas de Stock na Tabela Products" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "c:\Users\hneto\rest-ia-clean"

Write-Host "Executando correção..." -ForegroundColor Green
node scripts/supabase/fix-products-stock.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ CORREÇÃO CONCLUÍDA!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Reinicie a aplicação para aplicar as alterações." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "⚠️ Erro na correção. Verifique mensagens acima." -ForegroundColor Red
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
[System.Console]::ReadKey($true) | Out-Null
