@echo off
echo ========================================
echo    Tasca Do Vereda - Build Producao
echo ========================================
echo.

echo [1/3] Limpando builds anteriores...
if exist dist rmdir /s /q dist
if exist "src-tauri\target" rmdir /s /q "src-tauri\target"
echo ✅ Build anterior limpo

echo.
echo [2/3] Build web para producao...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro no build web
    pause
    exit /b 1
)
echo ✅ Build web concluido

echo.
echo [3/3] Build MSI para Windows...
call npm run build:app
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro no build MSI
    pause
    exit /b 1
)
echo ✅ Build MSI concluido

echo.
echo ========================================
echo           BUILD CONCLUIDO COM SUCESSO
echo ========================================
echo.
echo 📦 Arquivos gerados:
echo    🏢 MSI: src-tauri\target\release\bundle\msi\Tasca Do Vereda_1.0.5_x64_pt-PT.msi
echo    💻 EXE: src-tauri\target\release\tasca-do-vereda.exe
echo    🌐 WEB: dist\
echo.
echo 🚀 Tasca Do Vereda v1.0.5 - Production Ready!
echo.

echo.
echo Deseja abrir a pasta de release? (S/N)
set /p choice=
if /i "%choice%"=="S" (
    explorer "src-tauri\target\release\bundle\msi"
)

echo.
echo Pressione qualquer tecla para sair...
pause > nul
