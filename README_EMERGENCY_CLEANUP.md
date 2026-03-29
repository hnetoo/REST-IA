# 🚨 LIMPEZA DE EMERGÊNCIA - APP WINDOWS

## 📋 RESUMO DAS CORREÇÕES APLICADAS

### 1. ✅ Limpeza Manual de Emergência
- **Arquivo**: `WINDOWS_DATA_CLEANUP.bat`
- **Função**: Procura e apaga pastas de dados da app Windows
- **Locais verificados**:
  - `%APPDATA%\tasca-do-vereda`
  - `%LOCALAPPDATA%\tasca-do-vereda`
  - `%USERPROFILE%\tasca-do-vereda`
  - Ficheiros `.db` e `state.json`

### 2. ✅ Correção do Código (Store)
- **Arquivo**: `src/store/useStore.ts`
- **Alteração**: Prioridade total ao Supabase se online
- **Lógica**:
  - App Web: SEMPRE usa Supabase primeiro
  - Se Supabase retornar vazio/erro → limpa estado local IMEDIATAMENTE
  - App Tauri: Usa SQLite local (offline-first)
  - Evita valores fantasma

### 3. ✅ Botão de Reset Real
- **Arquivo**: `src/views/owner/OwnerDashboard.tsx`
- **Função**: `handleResetProduction()`
- **Comunicação**:
  - Envia sinal via Supabase Realtime (tabela `reset_signals`)
  - Envia via Broadcast Channel (fallback)
  - App Windows recebe e executa limpeza forçada

---

## 🎯 COMO USAR

### Opção 1: Script de Emergência
```bash
# Execute no Windows
WINDOWS_DATA_CLEANUP.bat
```

### Opção 2: Reset via Owner Hub
1. Abra o Owner Hub
2. Clique em "Reset Produção"
3. App Windows receberá sinal e limpará automaticamente

### Opção 3: Limpeza Manual
1. Feche a app Windows
2. Execute `WINDOWS_DATA_CLEANUP.bat`
3. Reabra a app

---

## 🔧 TECNOLOGIAS USADAS

- **Supabase Realtime**: Comunicação em tempo real
- **Broadcast Channel**: Fallback para tabs abertos
- **SQLite**: Storage local da app Windows
- **localStorage**: Cache web

---

## 🎯 RESULTADO ESPERADO

Após aplicar qualquer uma das opções:
- ✅ App Windows arranca com 0 Kz
- ✅ Dashboard mostra valores corretos do Supabase
- ✅ Sem valores fantasma do cache local
- ✅ Estado sincronizado com DB remoto

---

## 🚨 EM CASO DE PERSISTÊNCIA

Se a app continuar mostrando valores antigos:
1. Execute `WINDOWS_DATA_CLEANUP.bat`
2. Abra o console (F12) e execute: `localStorage.clear(); location.reload();`
3. Use o botão "🧹 LIMPAR ESTADO" (modo dev)
4. Execute `useStore.getState().clearZustandPersist()` no console
