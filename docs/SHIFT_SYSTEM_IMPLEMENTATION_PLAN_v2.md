# 📋 PLANO DE IMPLEMENTAÇÃO — SISTEMA DE TURNOS DE CAIXA v2

**Projeto:** Tasca do Vereda — POS & Gestão  
**Versão:** 1.0.11 (próxima)  
**Data:** 2026-06-17  
**Status:** ⏳ AGUARDANDO APROVAÇÃO DO CLIENTE

---

## 1. RESUMO EXECUTIVO

O sistema já tem **Fecho de Caixa** funcional no POS e **card de Fecho** no Owner Dashboard.  
Não vamos reinventar — vamos **adicionar turnos** (manhã/tarde) à lógica existente.

**O que já existe e funciona:**
- ✅ `handleCashClosingClick()` no POS — busca vendas, calcula por pagamento, guarda snapshot
- ✅ Tabela `cash_flow` com `category='FECHO_CAIXA'` e `data_contabil`
- ✅ Card no Owner Dashboard que mostra o snapshot do fecho
- ✅ Relatório imprimível de fecho de caixa

**O que vamos adicionar:**
- 🆕 Registo de **abertura de turno** (quem abriu, valor em caixa)
- 🆕 Fecho de caixa separado por **MANHÃ** e **TARDE**
- 🆕 Relatório de fecho de **turno** (só as vendas daquele turno)
- 🆕 Relatório de fecho do **dia** (admin — agrega manhã + tarde)

---

## 2. O QUE JÁ EXISTE (BASE)

### 2.1 Fecho de Caixa no POS (`POS.tsx`)

```typescript
// handleCashClosingClick já faz:
1. Determina o dia comercial (05:00 → 04:59) → closingDate
2. Busca orders do Supabase com .eq('data_contabil', closingDate)
3. Filtra status 'closed' ou 'paid'
4. Calcula paymentBreakdown por payment_method
5. Busca items vendidos (order_items + products)
6. Guarda snapshot na cash_flow com category='FECHO_CAIXA'
7. Verifica se já existe fecho para a data
8. Gera HTML para impressão via printCashClosing()
```

### 2.2 Tabela `cash_flow` (existente)

| Coluna | Uso Atual |
|---|---|
| `category` | `'FECHO_CAIXA'` |
| `data_contabil` | Dia operacional |
| `amount` | Total vendido no fecho |
| `description` | JSON com breakdown |

### 2.3 Card no Owner Dashboard

```
┌─────────────────────────────────────┐
│  📄 SNAPSHOT                          │
│  45.000 Kz                           │
│  Fecho de Caixa                      │
│  Valor no momento do fecho           │
└─────────────────────────────────────┘
```

---

## 3. ALTERAÇÕES NO SCHEMA SUPABASE

### 3.1 Nova Tabela: `pos_shift_records` (abertura/fecho de turno)

```sql
CREATE TABLE IF NOT EXISTS public.pos_shift_records (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_type      text NOT NULL CHECK (shift_type IN ('MORNING', 'AFTERNOON')),
    opened_by       text NOT NULL,           -- nome do operador (cache)
    opened_at       timestamp with time zone NOT NULL DEFAULT now(),
    opening_amount  numeric(12,2) NOT NULL DEFAULT 0,  -- valor em caixa na abertura
    closed_by       text,                  -- nome do operador que fechou
    closed_at       timestamp with time zone,
    closing_amount  numeric(12,2),         -- valor contado no fecho
    expected_amount numeric(12,2),         -- opening_amount + vendas do turno
    status          text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    data_contabil   date NOT NULL,         -- Dia Operacional
    notes           text,
    created_at      timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.pos_shift_records IS 'Registo de abertura e fecho de turnos de caixa (manhã/tarde). Um por turno por dia.';
```

### 3.2 Alteração Mínima: `orders.shift_id` (nullable)

```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.pos_shift_records(id);
COMMENT ON COLUMN public.orders.shift_id IS 'Turno de caixa associado. NULL = venda antes do sistema de turnos ou venda fora de turno.';
```

> **⚠️ CRÍTICO:** `shift_id` é **NULLABLE**. Tudo existente continua a funcionar 100%.

### 3.3 Alteração no `cash_flow`: mais categorias de fecho

Não precisamos de alterar a tabela — só vamos usar **novos valores** no campo `category`:

| Categoria | Quando Usar |
|---|---|
| `FECHO_CAIXA_MANHA` | Fecho do turno da manhã |
| `FECHO_CAIXA_TARDE` | Fecho do turno da tarde |
| `FECHO_CAIXA` | (mantido) Fecho geral do dia (legacy) |

---

## 4. FLUXO COMPLETO (COM TURNOS)

### Turno da Manhã

```
08:30 — Operador chega
  → [Abrir Turno Manhã] no POS
    → Input: valor em caixa (ex: 5.000 Kz)
    → Cria registo em pos_shift_records (status='OPEN', shift_type='MORNING')

08:30–14:00 — Vendas durante o turno
  → checkoutTable() verifica: há turno OPEN?
    → SIM: order.shift_id = turno.id
    → NÃO: order.shift_id = NULL (venda funciona 100%)

14:00 — Operador fecha turno
  → [Fechar Turno Manhã] no POS
    → Busca orders com shift_id = este turno
    → Calcula vendas por payment_method
    → Input: valor contado em caixa
    → Compara: expected = opening + vendas
    → Regista diferança
    → Atualiza pos_shift_records → status='CLOSED'
    → Guarda snapshot em cash_flow com category='FECHO_CAIXA_MANHA'
    → 🖨️ Imprime Relatório de Fecho de Turno
```

### Turno da Tarde

```
14:30 — Operador chega
  → [Abrir Turno Tarde] no POS
  → (mesmo fluxo, shift_type='AFTERNOON')

14:30–22:00 — Vendas
22:00 — Fecha turno
  → [Fechar Turno Tarde]
  → Guarda snapshot em cash_flow com category='FECHO_CAIXA_TARDE'
  → 🖨️ Imprime Relatório de Fecho de Turno
```

### Fecho do Dia (Admin)

```
22:05 — Admin faz fecho do dia
  → [Fecho do Dia] no Owner Dashboard ou POS
    → Busca:
      - pos_shift_records MORNING (CLOSED) para hoje
      - pos_shift_records AFTERNOON (CLOSED) para hoje
    → Agrega:
      - Vendas manhã por payment_method
      - Vendas tarde por payment_method
      - Total geral
    → Guarda em cash_flow com category='FECHO_DIA' (ou usa legacy 'FECHO_CAIXA')
    → 🖨️ Imprime Relatório de Fecho do Dia (manhã + tarde + total)
```

---

## 5. NOVOS COMPONENTES REACT

### 5.1 `ShiftManager.tsx` (Painel no POS / Menu Sistema)

```
┌─────────────────────────────────────┐
│  🏪 TURNO DE CAIXA                  │
│                                     │
│  Turno Atual: MANHÃ (08:30) ✅     │
│  Valor Abertura: 5.000 Kz          │
│                                     │
│  [Fechar Turno da Manhã]            │
│                                     │
│  ── ou ──                           │
│                                     │
│  [Abrir Turno da Manhã]             │
│  [Abrir Turno da Tarde]             │
│                                     │
│  [Fechar Turno da Tarde]            │
│                                     │
└─────────────────────────────────────┘
```

**Regras:**
- Só pode haver **um** turno `OPEN` de cada vez
- Não pode abrir tarde sem fechar manhã (aviso, não bloqueio)
- Fecho exige input de `closing_amount` (contagem de caixa)

### 5.2 `ShiftCloseReport.tsx` — Relatório de Fecho de Turno (imprimível)

**Conteúdo:**

```
═══════════════════════════════════════
   TASCA DO VEREDA — FECHO DE TURNO
═══════════════════════════════════════
Data: 17/06/2026
Turno: MANHÃ (08:30 → 14:00)
Operador: Ana Silva

── ABERTURA ───────────────────────────
Valor em caixa:    5.000 Kz

── VENDAS POR MODALIDADE ──────────────
NUMERÁRIO:        12.500 Kz
TPA:               8.000 Kz
TRANSFERÊNCIA:     3.500 Kz
QR CODE:           2.000 Kz

Total Vendas:      26.000 Kz

── RESUMO ─────────────────────────────
Esperado em caixa: 31.000 Kz
Contado:          31.000 Kz
Diferença:            0 Kz ✅

Assinatura: _______________
═══════════════════════════════════════
```

### 5.3 `DailyCloseReport.tsx` — Relatório de Fecho do Dia (admin)

```
═══════════════════════════════════════
   TASCA DO VEREDA — FECHO DO DIA
═══════════════════════════════════════
Data Operacional: 17/06/2026
Responsável: Admin Master

── TURNO DA MANHÃ ─────────────────────
Operador: Ana Silva (08:30 → 14:00)
NUMERÁRIO:        12.500 Kz
TPA:               8.000 Kz
TRANSFERÊNCIA:     3.500 Kz
QR CODE:           2.000 Kz
────────────────────────────
Subtotal Manhã:   26.000 Kz

── TURNO DA TARDE ─────────────────────
Operador: Carlos Pinto (14:30 → 22:00)
NUMERÁRIO:         9.000 Kz
TPA:              15.000 Kz
TRANSFERÊNCIA:     4.000 Kz
QR CODE:           1.000 Kz
────────────────────────────
Subtotal Tarde:   29.000 Kz

── TOTAL DO DIA ────────────────────────
Faturamento Total: 55.000 Kz

Diferenças:           0 Kz ✅

Assinatura: _______________
═══════════════════════════════════════
```

---

## 6. ALTERAÇÕES EM CÓDIGO EXISTENTE (MÍNIMAS)

### 6.1 `checkoutTable` em `useStore.ts` (~15 linhas)

```typescript
// NOVO: antes de inserir order no Supabase
const currentShift = await getCurrentOpenShift(); // busca pos_shift_records OPEN
if (currentShift) {
  orderData.shift_id = currentShift.id;
}
// Se não houver turno aberto, shift_id fica NULL (backward compatible)
```

### 6.2 `handleCashClosingClick` em `POS.tsx` (~30 linhas modificadas)

```typescript
// ANTES: sempre faz fecho geral do dia
// DEPOIS: pergunta "Fecho de que turno?"
//         - Se escolher MANHÃ: filtra orders com shift_type='MORNING'
//         - Se escolher TARDE: filtra orders com shift_type='AFTERNOON'
//         - Mantém opção "Fecho Geral do Dia" (legacy)
```

**Mudanças concretas:**
1. Adicionar modal/step para escolher o tipo de fecho (manhã/tarde/geral)
2. Se for turno: filtra `orders.shift_id = turno.id` em vez de só `data_contabil`
3. Guarda `category='FECHO_CAIXA_MANHA'` ou `FECHO_CAIXA_TARDE`
4. Atualiza `pos_shift_records` → status='CLOSED'

## 🔒 GARANTIA CRÍTICA: Cards "Faturação Hoje" NÃO são afetados pela mudança de turno

### Por que os cards continuam corretos?

O SyncCore (`useSyncCore.ts`) calcula `todayRevenue` usando **`data_contabil`** (Dia Operacional 05:00 → 04:59), NÃO usando `shift_id`:

```typescript
// useSyncCore.ts — CÁLCULO DO todayRevenue (JÁ EXISTE)
const hojeString = calculateDataContabil(new Date());

const { data: todayOrders } = await supabase
  .from('orders')
  .select('*')
  .eq('data_contabil', hojeString)   // ← BUSCA TODAS AS VENDAS DO DIA
  .in('status', ['closed', 'paid']);

const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
```

A coluna `shift_id` é **apenas um marcador** para relatórios de turno.  
O SyncCore **NUNCA** filtra por `shift_id`. Portanto:

| Cenário | Card DashboardV2 | Card Owner Dashboard |
|---|---|---|
| Turno da manhã aberto | ✅ Mostra vendas manhã | ✅ Mostra vendas manhã |
| Mudança para tarde | ✅ Mostra **manhã + tarde** | ✅ Mostra **manhã + tarde** |
| Turno da tarde fechado | ✅ Mostra **total do dia** | ✅ Mostra **total do dia** |
| Admin faz fecho do dia | ✅ **Mesmo valor** — não muda | ✅ **Mesmo valor** — não muda |

> **O `shift_id` é um EXTRA na tabela `orders`, não um filtro. O SyncCore continua a somar TUDO do dia.**

---

### 6.3 Owner Dashboard Card (existente)

**Mudança mínima:** O card já busca `cash_flow.category='FECHO_CAIXA'`.  
Podemos adicionar um **segundo card** ou expandir o existente para mostrar:

```
┌─────────────────────────────────────┐
│  📄 FECHO DO DIA                     │
│  55.000 Kz                           │
│                                     │
│  Manhã: 26.000 Kz                   │
│  Tarde: 29.000 Kz                   │
└─────────────────────────────────────┘
```

---

## 7. O QUE NÃO MUDA (GARANTIA ABSOLUTA)

| # | Funcionalidade | Estado |
|---|---|---|
| 1 | DashboardV2, Finance, ProfitCenter | ✅ Intactos |
| 2 | SyncCore (`todayRevenue`, `netProfit`) | ✅ Intacto |
| 3 | POS checkout (venda normal) | ✅ Intacto, + badge de turno |
| 4 | Orders antigas (sem shift_id) | ✅ Funcionam 100% |
| 5 | Fecho de caixa legacy (sem turnos) | ✅ Continua disponível |
| 6 | Card "Fecho de Caixa" no Owner Dashboard | ✅ Intacto, + info de turnos |
| 7 | AGT / Documentos fiscais | ✅ Intacto |
| 8 | Stock / Inventário | ✅ Intacto |
| 9 | Login / Users | ✅ Intacto |
| 10 | Electron / Vercel builds | ✅ Intacto |

---

## 8. ORDEM DE IMPLEMENTAÇÃO

| # | Tarefa | Ficheiros | Tempo Est. |
|---|---|---|---|
| 1 | Migration SQL: `pos_shift_records` + `orders.shift_id` | `supabase/schema.sql` | 30 min |
| 2 | Criar `ShiftManager.tsx` | Novo componente | 2h |
| 3 | Criar `ShiftCloseReport.tsx` (imprimível) | Novo componente | 1.5h |
| 4 | Criar `DailyCloseReport.tsx` (imprimível) | Novo componente | 1h |
| 5 | Modificar `checkoutTable` (ligar venda ao turno) | `src/store/useStore.ts` | 30 min |
| 6 | Modificar `handleCashClosingClick` (fecho por turno) | `src/views/POS.tsx` | 1.5h |
| 7 | Adicionar botão "Turno de Caixa" ao POS | `src/views/POS.tsx`, Sidebar | 30 min |
| 8 | Atualizar card no Owner Dashboard | `src/views/owner/OwnerDashboard.tsx` | 30 min |
| 9 | Testes manuais | — | 1h |
| 10 | Deploy + Build NSIS 1.0.11 | — | 30 min |

**Total estimado:** ~8 horas

---

## 9. PRÓXIMOS PASSOS

1. **Cliente aprova** este plano revisado
2. Crio migration SQL
3. Implemento componentes
4. Testo em Electron dev
5. Deploy Vercel + Build NSIS 1.0.11

---

**Assinado:** Cascade AI  
**Aguardando:** ✅ / ❌ Aprovação do Cliente
