# Script PowerShell para migração automática do Supabase
# Configura as variáveis de ambiente e executa o script Node.js

# Configurar variáveis de ambiente
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.9qV0p7ADmXYOYcYRLejlTwihFIlIIOS2W_tOkZwuPkw"
$env:VITE_SUPABASE_URL = "https://tboiuiwlqfzcvakxrsmj.supabase.co"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 MIGRAÇÃO AUTOMÁTICA - Eventos e Pacotes" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configurado:" -ForegroundColor Yellow
Write-Host "  URL: $env:VITE_SUPABASE_URL" -ForegroundColor Gray
Write-Host "  Service Role: $(($env:SUPABASE_SERVICE_ROLE_KEY).Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""

# Mudar para o diretório do projeto
Set-Location -Path "c:\Users\hneto\rest-ia-clean"

# Executar o script de migração
Write-Host "Executando migração..." -ForegroundColor Green
node scripts/supabase/auto-migrate-events.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ MIGRAÇÃO CONCLUÍDA COM ALGUNS ERROS" -ForegroundColor Yellow
    Write-Host "   Verifique as mensagens acima" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
