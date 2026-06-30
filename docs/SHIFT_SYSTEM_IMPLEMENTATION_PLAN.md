# 📋 PLANO DE IMPLEMENTAÇÃO — SISTEMA DE TURNOS DE CAIXA (V1)

**Projeto:** Tasca do Vereda — POS & Gestão  
**Versão:** 1.0.11 (próxima)  
**Data:** 2026-06-17  
**Status:** ⏳ AGUARDANDO APROVAÇÃO DO CLIENTE

---

## 1. RESUMO EXECUTIVO

Criar um **sistema de abertura/fecho de turnos** com dois turnos por dia (manhã e tarde), onde:
- Cada operador abre o seu turno → vende → fecha o turno → imprime relatório
- O admin faz o **fecho diário** consolidando os dois turnos
- **Nenhuma funcionalidade existente é removida ou alterada**

---

## 2. O QUE JÁ EXISTE (BASE SÓLIDA)

| Componente | Estado Atual | Relevância |
|---|---|---|
| `orders` no Supabase | ✅ Com `payment_method`, `data_contabil`, `status='closed'` | Base das vendas |
| `data_contabil` (Dia Operacional) | ✅ 05:00 às 04:59 (Africa/Luanda) | Define o "dia" de trabalho |
| SyncCore (`useSyncCore`) | ✅ Calcula `todayRevenue`, `totalExpenses`, `netProfit` | Motor financeiro intacto |
| `checkoutTable()` no POS | ✅ Grava venda no Supabase com payment_method | Ponto de inserção |
| POS (Point of Sale) | ✅ Funcional completo | Onde o operador vende |
| Relatórios existentes | ✅ Finance, ProfitCenter, DashboardV2 | **NÃO serão alterados** |

---

## 3. NOVAS TABELAS NO SUPABASE

### 3.1 `pos_shifts` — Turnos de Caixa

```sql
CREATE TABLE IF NOT EXISTS public.pos_shifts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_type      text NOT NULL CHECK (shift_type IN ('MORNING', 'AFTERNOON')),
    opened_by       uuid REFERENCES auth.users(id),
    opened_by_name  text,                        -- nome do operador (cache)
    opened_at       timestamp with time zone NOT NULL DEFAULT now(),
    closed_by       uuid REFERENCES auth.users(id),
    closed_by_name  text,
    closed_at       timestamp with time zone,
    opening_amount  numeric(12,2) NOT NULL DEFAULT 0,  -- valor em caixa na abertura
    closing_amount  numeric(12,2),                      -- valor contado no fecho
    expected_amount numeric(12,2),                    -- calculado: opening + vendas
    status          text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    data_contabil   date NOT NULL,                     -- Dia Operacional (05h-04h59)
    daily_close_id  uuid REFERENCES public.pos_daily_closes(id),
    notes           text,
    created_at      timestamp with time zone DEFAULT now(),
    updated_at      timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.pos_shifts IS 'Registo de abertura e fecho de turnos de caixa (manhã/tarde)';
```

### 3.2 `pos_daily_closes` — Fecho Diário do Admin

```sql
CREATE TABLE IF NOT EXISTS public.pos_daily_closes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data_contabil       date NOT NULL UNIQUE,          -- Dia Operacional
    closed_by           uuid REFERENCES auth.users(id),
    closed_by_name      text,
    closed_at           timestamp with time zone NOT NULL DEFAULT now(),
    morning_shift_id    uuid REFERENCES public.pos_shifts(id),
    afternoon_shift_id  uuid REFERENCES public.pos_shifts(id),
    total_revenue       numeric(12,2) DEFAULT 0,
    total_by_payment    jsonb DEFAULT '{}',               -- {"NUMERARIO": 15000, "TPA": 8000, ...}
    discrepancy_amount  numeric(12,2) DEFAULT 0,        -- diferença entre esperado e real
    status              text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLOSED')),
    notes               text,
    created_at          timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.pos_daily_closes IS 'Fecho diário consolidado (admin). Um por data_contabil.';
```

### 3.3 Alteração Mínima à `orders` (coluna opcional)

```sql
-- ADICIONAR coluna opcional (nullable) — NÃO quebra nada existente
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.pos_shifts(id);

COMMENT ON COLUMN public.orders.shift_id IS 'Turno de caixa associado à venda. NULL = venda anterior ao sistema de turnos.';
```

> **⚠️ Importante:** A coluna `shift_id` é **NULLABLE**. Vendas antigas e futuras sem turno continuam a funcionar 100%.

---

## 4. NOVOS COMPONENTES REACT

### 4.1 `ShiftManager.tsx` — Painel de Turno (POS / Menu Sistema)

```
┌─────────────────────────────────────┐
│  🏪 TURNO DE CAIXA                  │
│                                     │
│  [Abrir Turno da Manhã]             │
│    ↳ Input: Valor em caixa (Kz)     │
│    ↳ Confirmação de abertura        │
│                                     │
│  ── ou ──                           │
│                                     │
│  [Abrir Turno da Tarde]             │
│    ↳ Input: Valor em caixa (Kz)     │
│    ↳ Confirmação de abertura        │
│                                     │
│  [Fechar Turno Atual]               │
│    ↳ Contagem de caixa             │
│    ↳ Imprimir Relatório de Fecho    │
│                                     │
└─────────────────────────────────────┘
```

**Regras de negócio:**
- Não pode haver dois turnos `OPEN` ao mesmo tempo
- Turno da manhã: `opened_at` entre 05:00 e 12:00 (sugestão, não bloqueio)
- Turno da tarde: `opened_at` entre 12:00 e 23:00
- Ao fechar: calcula `expected_amount = opening_amount + vendas do turno`
- Diferença (`closing_amount - expected_amount`) é registada

### 4.2 `ShiftCloseReport.tsx` — Relatório de Fecho de Turno

**Conteúdo do relatório (imprimível):**

```
═══════════════════════════════════════
   TASCA DO VEREDA — FECHO DE TURNO
═══════════════════════════════════════
Data: 17/06/2026
Turno: MANHÃ (08:30 → 14:15)
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

── FECHO ───────────────────────────────
Hora: 14:15
Assinatura: _______________
═══════════════════════════════════════
```

### 4.3 `DailyCloseReport.tsx` — Relatório de Fecho Diário (Admin)

**Conteúdo do relatório:**

```
═══════════════════════════════════════
   TASCA DO VEREDA — FECHO DO DIA
═══════════════════════════════════════
Data Operacional: 17/06/2026
Responsável: Admin Master

── TURNO DA MANHÃ ─────────────────────
Operador: Ana Silva (08:30 → 14:15)
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

── FECHO ───────────────────────────────
Hora: 22:05
Assinatura: _______________
═══════════════════════════════════════
```

### 4.4 `DailyCloseButton.tsx` — Botão de Fecho Diário (somente ADMIN/OWNER)

- Aparece no menu do POS ou no SystemHub
- Só visível para `role === 'ADMIN' || role === 'OWNER'`
- Só ativo quando ambos os turnos estão `CLOSED`

---

## 5. ALTERAÇÕES NO FLUXO EXISTENTE (MÍNIMAS)

### 5.1 Checkout do POS (`checkoutTable` em `useStore.ts`)

**Alteração:** Antes de inserir a order no Supabase, verifica se existe um turno `OPEN`. Se sim, adiciona `shift_id` ao `orderData`.

```typescript
// NOVO: obter turno aberto atual
const currentShift = await getCurrentOpenShift();
if (currentShift) {
  orderData.shift_id = currentShift.id;
}
// Se não houver turno aberto, shift_id fica NULL (backward compatible)
```

> **Impacto:** ZERO se não houver turno aberto. A venda funciona 100% como hoje.

### 5.2 Hook `useSyncCore.ts`

**Alteração:** NENHUMA. O SyncCore continua a calcular `todayRevenue` por `data_contabil`.  
Opcionalmente, podemos adicionar `todayRevenueByShift` como campo extra (não obrigatório).

---

## 6. SEGURANÇA E PERMISSÕES (RLS)

```sql
-- pos_shifts: todos podem ver, só ADMIN/CAIXA podem criar
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pos_shifts_select ON public.pos_shifts FOR SELECT USING (true);
CREATE POLICY pos_shifts_insert ON public.pos_shifts FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated')  -- qualquer user logado pode abrir
);
CREATE POLICY pos_shifts_update ON public.pos_shifts FOR UPDATE USING (
    opened_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.pos_operators WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER')
    )
);

-- pos_daily_closes: só ADMIN/OWNER
ALTER TABLE public.pos_daily_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pos_daily_closes_select ON public.pos_daily_closes FOR SELECT USING (true);
CREATE POLICY pos_daily_closes_insert ON public.pos_daily_closes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_operators WHERE id = auth.uid() AND role IN ('ADMIN', 'OWNER'))
);
```

---

## 7. ORDEM DE IMPLEMENTAÇÃO

| # | Tarefa | Ficheiros Alterados | Tempo Est. |
|---|---|---|---|
| 1 | Migration SQL no Supabase | `supabase/schema.sql` (novas tabelas) | 30 min |
| 2 | Update `orders` table (shift_id nullable) | `supabase/schema.sql` | 10 min |
| 3 | Criar `ShiftManager.tsx` | `src/components/ShiftManager.tsx` (novo) | 2h |
| 4 | Criar `ShiftCloseReport.tsx` (imprimível) | `src/components/ShiftCloseReport.tsx` (novo) | 1.5h |
| 5 | Criar `DailyCloseReport.tsx` (imprimível) | `src/components/DailyCloseReport.tsx` (novo) | 1.5h |
| 6 | Integrar no POS (checkoutTable) | `src/store/useStore.ts` (~10 linhas) | 30 min |
| 7 | Adicionar botão "Turno de Caixa" ao POS/Sidebar | `src/views/POS.tsx`, `src/components/Sidebar.tsx` | 30 min |
| 8 | Adicionar botão "Fecho do Dia" (admin) | `src/views/SystemHub.tsx` | 30 min |
| 9 | Testes manuais (abrir, vender, fechar, imprimir) | — | 1h |
| 10 | Deploy Vercel + Build Electron | — | 30 min |

**Total estimado:** ~8-9 horas de trabalho

---

## 8. O QUE NÃO MUDA (GARANTIA)

| # | Funcionalidade | Estado |
|---|---|---|
| 1 | DashboardV2 (cards de hoje) | ✅ Intacto |
| 2 | Finance.tsx (relatórios financeiros) | ✅ Intacto |
| 3 | ProfitCenter.tsx (centro de lucro) | ✅ Intacto |
| 4 | SyncCore (motor de dados) | ✅ Intacto |
| 5 | POS (interface de venda) | ✅ Intacto, + badge de turno |
| 6 | Orders (tabela existente) | ✅ Intacto, + coluna opcional |
| 7 | AGT / Documentos fiscais | ✅ Intacto |
| 8 | Stock / Inventário | ✅ Intacto |
| 9 | Login / Users | ✅ Intacto |
| 10 | Electron / Vercel builds | ✅ Intacto |

---

## 9. DECISÕES DE DESIGN

### Por que `shift_id` nullable na `orders`?
- Para não quebrar vendas antigas
- Para permitir vendas "fora de turno" (emergência)
- Para facilitar rollout gradual

### Por que dois turnos (manhã/tarde) e não mais?
- Requisito explícito do cliente
- Fácil de estender no futuro para `NIGHT` ou turnos customizáveis

### Por que `pos_daily_closes` separado de `pos_shifts`?
- O fecho diário é uma ação do admin, não do caixa
- Permite o admin fazer o fecho no dia seguinte se necessário
- Separa responsabilidades (SRP)

### Por que `data_contabil` em vez de `created_at::date`?
- O sistema já usa `data_contabil` (Dia Operacional 05:00-04:59)
- Mantém consistência com o resto da app

---

## 10. PRÓXIMOS PASSOS (APÓS APROVAÇÃO)

1. **Cliente aprova** este plano
2. Crio as migrations SQL no Supabase
3. Implemento os componentes React
4. Testo em Electron dev mode
5. Deploy Vercel + Build NSIS 1.0.11
6. Entrego ao cliente para teste

---

**Assinado:** Cascade AI  
**Aguardando:** ✅ / ❌ Aprovação do Cliente
