#!/bin/bash

# Build para Windows com injeção de variáveis Supabase
echo "🔧 Build Windows - Injetando variáveis Supabase..."

# Definir variáveis de ambiente para o build
export VITE_SUPABASE_URL="https://tboiuiwlqfzcvakxrsmj.supabase.co"
export VITE_SUPABASE_ANON_KEY="sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm"

# Build do frontend
echo "📦 Build frontend com variáveis..."
npm run build

# Build Tauri
echo "🪟 Build Tauri Windows..."
npm run tauri build --target x86_64-pc-windows-msvc

echo "✅ Build concluído com sucesso!"
