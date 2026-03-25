# Build para Windows com injeção de variáveis Supabase
Write-Host "Build Windows - Injetando variaveis Supabase..." -ForegroundColor Green

# Definir variáveis de ambiente para o build
$env:VITE_SUPABASE_URL="https://tboiuiwlqfzcvakxrsmj.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm"

Write-Host "URL Supabase: $env:VITE_SUPABASE_URL" -ForegroundColor Cyan
Write-Host "Anon Key: $env:VITE_SUPABASE_ANON_KEY" -ForegroundColor Cyan

# Build do frontend
Write-Host "Build frontend com variaveis..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no build frontend" -ForegroundColor Red
    exit 1
}

# Build Tauri
Write-Host "Build Tauri Windows..." -ForegroundColor Yellow
tauri build --target x86_64-pc-windows-msvc

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no build Tauri" -ForegroundColor Red
    exit 1
}

Write-Host "Build concluido com sucesso!" -ForegroundColor Green
Write-Host "MSI em: src-tauri\target\release\bundle\msi\" -ForegroundColor Green
