# Relatorio de Performance — App Windows/Tauri
## REST-IA (Tasca do Vereda) — Versao Desktop Usada Diariamente

**Data:** 2026-06-04  
**Auditor:** Analise Senior de Performance  
**Arquivo:** src/App_tauri.tsx (~838 linhas)

---

## 1. DIAGNOSTICO GERAL

O App_tauri.tsx ja tem lazy loading implementado, mas existem **gargalos criticos no startup** e **consumo desnecessario de recursos** que afetam o dia-a-dia na loja.

---

## 2. PROBLEMAS CRITICOS ENCONTRADOS

### 🔴 PROBLEMA 1: Fetch duplicado no startup bloqueia login (RISCO: CRITICO)

**Local:** Linhas 351-439 — `forceInitialSupabaseFetch()`

```typescript
// EXECUTA AUTOMATICAMENTE ao detectar sessao local
setTimeout(forceInitialSupabaseFetch, 2000);
```

O que faz:
1. Busca **50 ordens** do Supabase
2. Busca **50 despesas** do Supabase
3. Formata e insere no estado local
4. Tudo isso **antes** do usuario fazer qualquer acao

**Impacto real:**
- Usuario abre o app → espera 2s → app faz 2 queries pesadas → login fica lento
- Se internet estiver lenta (comum em Angola), o startup demora 5-10s
- Usuario do caixa quer vender rapido, mas o app esta "pensando"

**Ganho estimado:** Reduzir tempo de startup de 3-5s para <1s

---

### 🔴 PROBLEMA 2: Schema SQL de 150 linhas sempre carregado (RISCO: ALTO)

**Local:** Linhas 535-701 — `runAutoSchema()`

```typescript
const schemaSQL = `
  CREATE TABLE IF NOT EXISTS categories (... 20+ tabelas ...)
  INSERT OR IGNORE INTO categories (...) 
  INSERT OR IGNORE INTO products (...)
  -- 150+ linhas de SQL inline
`;
```

**Impacto:**
- String de 4KB+ sempre na memoria, mesmo que ja esteja configurado
- So usado UMA vez (primeira instalacao)
- Ocupacao desnecessaria de heap

**Ganho estimado:** -4KB de memoria RAM (pouco, mas limpo)

---

### 🟡 PROBLEMA 3: Realtime listeners sempre ativos (RISCO: MEDIO)

**Local:** Linhas 181-292 — useEffect dos listeners

```typescript
const resetChannel = supabase.channel('reset_signals').on(...).subscribe();
const ordersChannel = supabase.channel('orders_realtime').on(...).subscribe();
const broadcastChannel = new BroadcastChannel('vereda_reset_sync');
```

**Impacto:**
- 3 conexoes WebSocket sempre abertas
- Consumo de CPU e bateria (notebook)
- Trafego de rede constante
- Se houver 5 PCs na loja, cada um tem 3 conexoes = 15 WebSockets

**Ganho estimado:** Menor consumo de CPU/bateria, menos trafego de rede

---

### 🟡 PROBLEMA 4: Botao de limpeza em dev carregado em producao (RISCO: BAIXO)

**Local:** Linhas 151-179

```typescript
if (process.env.NODE_ENV === 'development') {
  // Cria botao DOM manualmente
  const cleanButton = document.createElement('button');
  // ... styled inline ...
  document.body.appendChild(cleanButton);
}
```

**Problema:** `process.env.NODE_ENV` pode ser `undefined` em build Tauri, fazendo o botao aparecer na producao.

**Ganho:** Remover codigo morto/potencialmente perigoso

---

### 🟡 PROBLEMA 5: Supabase client criado no startup mesmo offline (RISCO: MEDIO)

**Local:** Linhas 471-476

```typescript
const client = createClient(localUrl, localKey);
const { error } = await client.from('products').select('id').limit(1);
```

**Impacto:** Se nao houver internet, o `createClient` + teste gera timeout de 3-5s.

**Ganho estimado:** Startup mais rapido em modo offline

---

## 3. PLANO DE OTIMIZACAO PARA TAURI

### FASE T1: Remover fetch duplicado no startup (RISCO: ZERO — mover para demanda)

**Mudanca:** Em vez de buscar orders/despesas automaticamente no startup, buscar **so quando o usuario abrir POS/Finance/Reports**.

```typescript
// ❌ ANTES: Fetch automatico no startup
setTimeout(forceInitialSupabaseFetch, 2000);

// ✅ DEPOIS: Cada view busca seus proprios dados quando monta
// DashboardV2.tsx ja usa useSyncCore — migrar POS/Finance para o mesmo padrao
```

**Risco:** ZERO — ja funciona assim na versao web (App.tsx)  
**Tempo:** 10 minutos  
**Ganho:** Startup 2-3x mais rapido

---

### FASE T2: Extrair schema SQL para arquivo separado (RISCO: ZERO)

**Mudanca:** Mover o SQL de 150 linhas para `src/lib/autoSchema.sql`

```typescript
// ❌ ANTES: SQL inline de 150 linhas
const schemaSQL = `CREATE TABLE ...`;

// ✅ DEPOIS: Import dinamico so quando necessario
const { schemaSQL } = await import('./lib/autoSchema.sql?raw');
```

**Risco:** ZERO — so move texto para arquivo externo  
**Tempo:** 5 minutos  
**Ganho:** Memoria mais limpa, codigo mais legivel

---

### FASE T3: Lazy-load SetupModal (RISCO: BAIXO)

**Mudanca:** SetupModal so aparece na primeira vez

```typescript
// ❌ ANTES
import SetupModal from './components/SetupModal';

// ✅ DEPOIS
const SetupModal = lazy(() => import('./components/SetupModal'));
```

**Risco:** Baixo — SetupModal ja tem Suspense no fallback  
**Tempo:** 2 minutos  
**Ganho:** ~5-10KB a menos no bundle inicial

---

### FASE T4: Desativar realtime quando offline (RISCO: MEDIO)

**Mudanca:** So ativar realtime quando houver conexao confirmada

```typescript
// ❌ ANTES: Sempre ativo
useEffect(() => {
  supabase.channel('orders_realtime').subscribe(); // sempre
}, []);

// ✅ DEPOIS: Condicional
useEffect(() => {
  if (navigator.onLine) {
    supabase.channel('orders_realtime').subscribe();
  }
}, []);
```

**Risco:** Medio — testar reconexao quando volta a internet  
**Tempo:** 10 minutos  
**Ganho:** Menos CPU, bateria e trafego de rede

---

### FASE T5: Remover botao de limpeza dev (RISCO: ZERO)

**Mudanca:** Deletar ou condicionar melhor

```typescript
// ❌ ANTES
if (process.env.NODE_ENV === 'development') {

// ✅ DEPOIS
if (process.env.NODE_ENV === 'development' && import.meta.env.DEV) {
```

**Risco:** ZERO  
**Tempo:** 1 minuto

---

## 4. IMPACTO ESTIMADO TOTAL (TAURI)

| Otimizacao | Impacto no dia-a-dia | Ganho |
|------------|---------------------|-------|
| **T1: Remover fetch startup** | Caixa abre app e vende em 1s | **CRITICO** |
| **T2: Extrair schema SQL** | Memoria mais limpa | Baixo |
| **T3: Lazy SetupModal** | Startup leve | Baixo |
| **T4: Realtime condicional** | PC nao trava, bateria dura mais | Medio |
| **T5: Remover botao dev** | Seguranca/profissionalismo | Baixo |

**Ganho total:** App inicia 2-3x mais rapido, usa menos bateria/rede

---

## 5. RECOMENDACAO

> **Implementar T1 imediatamente** — e a mudanca mais impactante para o dia-a-dia do restaurante. O caixa nao deve esperar 3-5s para o app ficar pronto.
> 
> T2 e T3 sao "quick wins" (5 min cada).
> T4 requer teste de reconexao.
> T5 e trivial.

---

*Relatorio gerado em: 2026-06-04*  
*Proxima acao recomendada: FASE T1 (remover fetch duplicado do startup)*
