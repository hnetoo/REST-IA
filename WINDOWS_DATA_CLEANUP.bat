@echo off
echo 🔍 LIMPANDO DADOS DA APP WINDOWS - EMERGÊNCIA
echo.

REM 1. AppData/Roaming
echo [1] Procurando em AppData\Roaming...
if exist "%APPDATA%\tasca-do-vereda" (
    echo    Encontrado: %APPDATA%\tasca-do-vereda
    echo    Apagando...
    rmdir /s /q "%APPDATA%\tasca-do-vereda"
    echo    ✅ Apagado com sucesso
) else (
    echo    Pasta não encontrada
)

if exist "%APPDATA%\tasca" (
    echo    Encontrado: %APPDATA%\tasca
    echo    Apagando...
    rmdir /s /q "%APPDATA%\tasca"
    echo    ✅ Apagado com sucesso
) else (
    echo    Pasta não encontrada
)

if exist "%APPDATA%\vereda" (
    echo    Encontrado: %APPDATA%\vereda
    echo    Apagando...
    rmdir /s /q "%APPDATA%\vereda"
    echo    ✅ Apagado com sucesso
) else (
    echo    Pasta não encontrada
)

REM 2. AppData/Local
echo.
echo [2] Procurando em AppData\Local...
if exist "%LOCALAPPDATA%\tasca-do-vereda" (
    echo    Encontrado: %LOCALAPPDATA%\tasca-do-vereda
    echo    Apagando...
    rmdir /s /q "%LOCALAPPDATA%\tasca-do-vereda"
    echo    ✅ Apagado com sucesso
) else (
    echo    Pasta não encontrada
)

REM 3. User Profile
echo.
echo [3] Procurando em User Profile...
if exist "%USERPROFILE%\tasca-do-vereda" (
    echo    Encontrado: %USERPROFILE%\tasca-do-vereda
    echo    Apagando...
    rmdir /s /q "%USERPROFILE%\tasca-do-vereda"
    echo    ✅ Apagado com sucesso
) else (
    echo    Pasta não encontrada
)

REM 4. Procurar ficheiros .db e .json
echo.
echo [4] Procurando ficheiros de dados...
echo Procurando .db em AppData...
for /r "%APPDATA%" %%f in (*.db) do (
    if exist "%%f" (
        echo    Encontrado DB: %%f
        del "%%f"
        echo    ✅ Apagado
    )
)

echo Procurando state.json em AppData...
for /r "%APPDATA%" %%f in (state.json) do (
    if exist "%%f" (
        echo    Encontrado State: %%f
        del "%%f"
        echo    ✅ Apagado
    )
)

echo.
echo ✅ LIMPEZA DE EMERGÊNCIA CONCLUÍDA!
echo A aplicação vai arrancar com 0 Kz agora.
echo.
pause
