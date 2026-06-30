# Proposta: Ponto de Equilíbrio (Break-Even) + BI Integrado no Dashboard Atual

## REGRA DE OURO
Nenhuma funcionalidade existente será removida ou alterada. Apenas **adições** ao DashboardV2 existente.

---

## 1. DIAGNÓSTICO DO DASHBOARD ATUAL

### O que já existe (NÃO MEXER):
- **8 cards de KPIs**: Faturação Hoje, Despesas Hoje, Custos Staff, Lucro Operacional, Rendimento Global, Impostos, Despesas Totais, Reserva Fiscal Anual
- **Gráfico de Fluxo de Receita Semanal** (LineChart)
- **Log de Vendas Ativo** (lista de facturas recentes)
- **IA Assistant** (painel de análise IA)
- **Reserva Fiscal AGT** (já calculada)

### O que FALTA:
- **Ponto de Equilíbrio (Break-Even)** — quanto precisa faturar para cobrir todos os custos
- **Indicadores BI** — margem de contribuição, ticket médio, taxa de ocupação, ROI
- **Gráficos BI** — distribuição de receita por categoria, comparação mensal
- **Alertas inteligentes** — quando está abaixo do ponto de equilíbrio

---

## 2. PROPOSTA DE IMPLEMENTAÇÃO

### 2.1 Nova Seção: "Ponto de Equilíbrio (Break-Even)"

**Localização**: Entre a linha de cards atual e o gráfico de receita semanal (linha ~738 do DashboardV2.tsx)

**Componente**: Card destacado com cálculo visual do Break-Even

```
┌──────────────────────────────────────────────────────────┐
│  🎯 PONTO DE EQUILÍBRRIO (BREAK-EVEN)                     │
│                                                          │
│  Custos Fixos (mensal):     350.000 Kz                   │
│  Custos Variáveis (hoje):    45.000 Kz                   │
│  Faturação Hoje:            120.000 Kz                   │
│  Margem Contribuição:        75.000 Kz (62.5%)           │
│                                                          │
│  ───────────────────────────────────────                 │
│  Break-Even Diário:         56.000 Kz/dia                │
│  Break-Even Mensal:       1.680.000 Kz/mês               │
│                                                          │
│  Estado: ✅ ACIMA do Break-Even (+64.000 Kz)             │
│  ── OU ──                                               │
│  Estado: ⚠️ ABAIXO do Break-Even (-X Kz)                 │
│                                                          │
│  [Barra de progresso visual]                             │
│  ████████████░░░░░░░  68% da meta diária                 │
└──────────────────────────────────────────────────────────┘
```

**Cálculos**:
- **Custos Fixos** = staffCosts (mensal) + despesas fixas (aluguer, etc.)
- **Custos Variáveis** = todayExpenses (despesas operacionais do dia)
- **Margem de Contribuição** = Faturação - Custos Variáveis
- **Margem %** = (Margem / Faturação) × 100
- **Break-Even Diário** = Custos Fixos Mensal / 30 dias
- **Break-Even Mensal** = Custos Fixos Mensal / Margem %
- **Estado** = Faturação Hoje vs Break-Even Diário

### 2.2 Nova Seção: "BI Dashboard" (3 cards de indicadores)

**Localização**: Logo abaixo do Ponto de Equilíbrio

```
┌─────────────────┬─────────────────┬─────────────────┐
│ 📊 Ticket Médio │ 👥 Taxa Ocupação │ 📈 Margem Lucro │
│                 │                 │                 │
│   8.500 Kz      │      68%        │     22.5%       │
│                 │                 │                 │
│  14 vendas      │  9 de 12 mesas  │  Lucro/Vendas   │
│  hoje           │  ocupadas       │  (descontando   │
│                 │                 │  impostos)      │
└─────────────────┴─────────────────┴─────────────────┘
```

**Cálculos**:
- **Ticket Médio** = todayRevenue / número de vendas fechadas hoje
- **Taxa de Ocupação** = mesas ocupadas / total de mesas (do store)
- **Margem de Lucro** = (Lucro Operacional / Faturação) × 100

### 2.3 Novo Gráfico BI: "Receita vs Custos vs Break-Even" (Semanal)

**Localização**: Abaixo do gráfico de Fluxo de Receita existente

```
┌──────────────────────────────────────────────────────────┐
│  📊 BI: Receita vs Custos vs Break-Even (7 dias)         │
│                                                          │
│  Receita ████████ ████████ ████████ ████████             │
│  Custos  ████     ████     ████     ████                 │
│  B.Even  ─────────────────────────────────── (linha)     │
│                                                          │
│  [BarChart com 3 séries: Receita, Custos, Break-Even]    │
└──────────────────────────────────────────────────────────┘
```

### 2.4 Novo Gráfico BI: "Distribuição de Receita por Categoria"

**Localização**: Ao lado do gráfico BI semanal

```
┌──────────────────────────────────────────────────────────┐
│  🥧 Receita por Categoria (Hoje)                         │
│                                                          │
│  [PieChart ou BarChart horizontal]                       │
│  Bebidas      ████████████  45%                          │
│  Pratos       ████████      30%                          │
│  Sobremesas   ████          15%                          │
│  Entradas     ██            10%                          │
└──────────────────────────────────────────────────────────┘
```

### 2.5 Alerta Visual de Break-Even

**Localização**: Banner no topo do dashboard (condicional)

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️ ATENÇÃO: Faturação de hoje (45.000 Kz) está ABAIXO   │
│  do Ponto de Equilíbrio (56.000 Kz). Falta: 11.000 Kz.   │
│  Recomendação: Promover vendas de alto margem.           │
└──────────────────────────────────────────────────────────┘
```

Aparece **apenas** quando faturação < break-even diário. Verde quando acima.

---

## 3. ESTRUTURA TÉCNICA

### 3.1 Dados Necessários (JÁ DISPONÍVEIS no DashboardV2)

| Dado | Fonte | Já existe? |
|---|---|---|
| `todayRevenue` | `useSyncCoreSmart` | ✅ Sim |
| `todayExpenses` | `useSyncCoreSmart` | ✅ Sim |
| `staffCosts` | `useSyncCoreSmart` | ✅ Sim |
| `totalExpenses` | `useSyncCoreSmart` | ✅ Sim |
| `settings.taxRate` | `useStore` | ✅ Sim |
| `activeOrders` | `useStore` | ✅ Sim |
| `supabaseOrders` | estado local | ✅ Sim |
| `customers` | `useStore` | ✅ Sim |
| `menu` (categorias) | `useStore` | ✅ Sim |
| `tables` (mesas) | `useStore` | ✅ Sim |

### 3.2 Novos Cálculos (useMemo)

```typescript
// Ponto de Equilíbrio
const breakEven = useMemo(() => {
  const custosFixosMensal = (staffCosts || 0) + custosFixosEstimados;
  const custosVariaveisHoje = todayExpenses || 0;
  const faturacaoHoje = todayRevenue || 0;
  const margemContribuicao = faturacaoHoje - custosVariaveisHoje;
  const margemPercentual = faturacaoHoje > 0 ? (margemContribuicao / faturacaoHoje) * 100 : 0;
  const breakEvenDiario = custosFixosMensal / 30;
  const breakEvenMensal = margemPercentual > 0 ? custosFixosMensal / (margemPercentual / 100) : 0;
  const acimaBreakEven = faturacaoHoje >= breakEvenDiario;
  const diferenca = faturacaoHoje - breakEvenDiario;
  
  return { breakEvenDiario, breakEvenMensal, margemContribuicao, margemPercentual, acimaBreakEven, diferenca };
}, [staffCosts, todayExpenses, todayRevenue]);

// Ticket Médio
const ticketMedio = useMemo(() => {
  const vendasHoje = supabaseOrders.filter(o => o.status === 'closed').length;
  return vendasHoje > 0 ? todayRevenue / vendasHoje : 0;
}, [supabaseOrders, todayRevenue]);

// Taxa de Ocupação
const taxaOcupacao = useMemo(() => {
  const totalMesas = tables.length;
  const mesasOcupadas = tables.filter(t => t.status === 'OCUPADO').length;
  return totalMesas > 0 ? (mesasOcupadas / totalMesas) * 100 : 0;
}, [tables]);

// Margem de Lucro
const margemLucro = useMemo(() => {
  const lucro = todayRevenue - todayExpenses - staffCosts;
  return todayRevenue > 0 ? (lucro / todayRevenue) * 100 : 0;
}, [todayRevenue, todayExpenses, staffCosts]);
```

### 3.3 Custos Fixos Estimados

Como o sistema não tem um registo explícito de "custos fixos mensais" (aluguer, água, luz), proponho:

**Opção A** (Simples): Usar `staffCosts × 1.5` como estimativa (staff + infraestrutura)
**Opção B** (Configurável): Adicionar campo `custosFixosMensal` nas Settings (editável)
**Opção C** (Automático): Somar todas as despesas da categoria "Manutenção" + "Limpeza" do mês + staffCosts

**Recomendação**: **Opção B** — adicionar um campo nas Settings para "Custos Fixos Mensais" com valor padrão de 350.000 Kz, editável pelo utilizador.

---

## 4. LAYOUT FINAL (Sem Quebrar o Existente)

```
DashboardV2.tsx (estrutura atual + adições)
│
├── [EXISTENTE] Header com título + refresh
├── [NOVO] Alerta Break-Even (condicional, só se abaixo)
│
├── [EXISTENTE] Grid 4 cards (Faturação, Despesas, Staff, Lucro)
├── [EXISTENTE] Grid 4 cards (Rendimento, Impostos, Despesas Total, Reserva)
│
├── [NOVO] Seção Ponto de Equilíbrio (card destacado)
├── [NOVO] Grid 3 cards BI (Ticket Médio, Ocupação, Margem)
│
├── [EXISTENTE] Grid 3 colunas:
│   ├── [EXISTENTE] Fluxo Receita Semanal (LineChart)
│   ├── [NOVO] Receita vs Custos vs Break-Even (BarChart)
│   └── [EXISTENTE] Log de Vendas
│
├── [NOVO] Grid 2 colunas:
│   ├── [NOVO] Receita por Categoria (BarChart/PieChart)
│   └── [EXISTENTE] IA Assistant
│
└── [EXISTENTE] Footer
```

---

## 5. IMPACTO

- **Zero funcionalidades removidas**: Tudo o que existe continua igual
- **Zero alterações na base de dados**: Usa dados já disponíveis
- **Zero alterações no store**: Usa `useSyncCoreSmart` + `useStore` existentes
- **Performance**: Novos `useMemo` são cálculos leves (O(n) simples)
- **Bundle**: +1 import (Cell do recharts já importado noutros ficheiros)

---

## 6. ESTIMATIVA DE ESFORÇO

| Fase | Descrição | Tempo |
|---|---|---|
| 1 | Ponto de Equilíbrio (card + cálculos) | ~1h |
| 2 | 3 Cards BI (Ticket Médio, Ocupação, Margem) | ~30min |
| 3 | Gráfico Receita vs Custos vs Break-Even | ~1h |
| 4 | Gráfico Receita por Categoria | ~1h |
| 5 | Alerta Break-Even (banner condicional) | ~30min |
| 6 | Campo "Custos Fixos Mensais" nas Settings | ~30min |
| 7 | Testes + ajustes visuais | ~1h |
| **Total** | | **~5h** |

---

## 7. PRÉ-REQUISITOS

1. **Aprovação do utilizador** para esta proposta
2. **Decisão sobre Custos Fixos**: Opção A (estimativa), B (configurável) ou C (automático)
3. **Decisão sobre cores**: Manter paleta cyan/amber ou adicionar novas cores para BI

---

## 8. O QUE NÃO SERÁ FEITO

- ❌ Não criar página/rota nova
- ❌ Não alterar rota do dashboard
- ❌ Não remover cards existentes
- ❌ Não alterar lógica do SyncCore
- ❌ Não alterar base de dados
- ❌ Não adicionar novas dependências (recharts já existe)

---

## 9. BENEFÍCIOS ESPERADOS

1. **Visão financeira clara**: Saber instantaneamente se está a ganhar ou perder dinheiro
2. **Decisões rápidas**: Alerta visual quando abaixo do break-even
3. **KPIs de negócio**: Ticket médio, ocupação e margem em tempo real
4. **Comparação visual**: Receita vs Custos lado a lado no gráfico
5. **Distribuição de receita**: Saber quais categorias geram mais dinheiro

---

ESTADO: **PENDENTE APROVAÇÃO DO UTILIZADOR**

Aguardando confirmação antes de iniciar implementação.
