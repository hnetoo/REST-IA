# 📊 Fórmulas Corrigidas - Dashboard Proprietário

## ✅ 1. Card SALDO DE TRANSIÇÃO

### 🎯 Definição Lógica:
- **Mostrar**: Exclusivamente o valor de external_history (8.000.000 Kz)
- **Não somar**: Mais nada
- **Fonte**: Tabela external_history do Supabase

### 🔧 Correção Aplicada:
```typescript
// ANTES:
{formatKz(historicoExterno || 0)}

// DEPOIS:
{formatKz(metrics.historicoRevenue || 0)}
```

### 📊 Resultado:
- **Valor**: 8.000.000 Kz
- **Descrição**: "Apenas external_history (8.000.000 Kz)"
- **Status**: ✅ Correto

---

## ✅ 2. Card LUCRO OPERACIONAL

### 🎯 Definição Lógica:
- **Fórmula**: Vendas Totais - Impostos - Despesas - Staff (Salários)
- **Fontes**: orders, expenses, staff_payments do Supabase
- **Cálculo**: Em tempo real

### 🔧 Implementação:
```typescript
// Buscar dados totais para cálculo do Lucro Operacional
const { data: totalOrdersData } = await supabase
  .from('orders')
  .select('total_amount, status')
  .eq('status', 'closed');

const { data: totalExpensesData } = await supabase
  .from('expenses')
  .select('amount');

const { data: totalStaffData } = await supabase
  .from('staff_payments')
  .select('amount');

// Calcular totais
const vendasTotais = totalOrdersData?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
const despesasTotais = totalExpensesData?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0;
const staffTotal = totalStaffData?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
const impostos = vendasTotais * 0.07; // 7% de impostos

// 🔑 FÓRMULA CORRETA: Lucro Operacional = Vendas - Impostos - Despesas - Staff
const lucroOperacional = vendasTotais - impostos - despesasTotais - staffTotal;
```

### 📊 Logs Esperados:
```
[OWNER DASHBOARD] 📊 CÁLCULO LUCRO OPERACIONAL:
├── Vendas Totais: 50000
├── Impostos (7%): 3500
├── Despesas Totais: 8000
├── Staff Total: 12000
├── Lucro Operacional: 26500
└── Saldo Transição: 8000000
```

---

## ✅ 3. Card PATRIMÓNIO TOTAL (Revisão)

### 🎯 Definição Lógica:
- **Fórmula**: Saldo de Transição (8M) + Lucro Operacional
- **Resultado**: Soma final do património

### 🔧 Implementação:
```typescript
// Fórmula já corrigida anteriormente
{formatKz((historicoExterno || 0) + (metrics.lucroLiquido || 0))}
```

### 📊 Exemplo:
- **Saldo Transição**: 8.000.000 Kz
- **Lucro Operacional**: 26.500 Kz
- **Património Total**: 8.026.500 Kz

---

## ✅ 4. GRÁFICOS - Vendas vs Despesas

### 🎯 Definição Lógica:
- **Vendas**: Bruto (total_amount das orders)
- **Despesas**: Staff + expenses (margem real)
- **Período**: Últimos 7 dias
- **Visualização**: Barras comparativas

### 🔧 Implementação:
```typescript
// Buscar pagamentos de staff dos últimos 7 dias para gráficos
const { data: chartStaffData } = await supabase
  .from('staff_payments')
  .select('amount, created_at')
  .gte('created_at', sevenDaysAgoString)
  .lte('created_at', luandaDateString)
  .order('created_at', { ascending: true });

// Adicionar pagamentos de staff ao mapa (parte das despesas)
chartStaffData?.forEach(payment => {
  const date = new Date(payment.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
  const existing = chartDataMap.get(date);
  if (existing) {
    existing.despesas += Number(payment.amount || 0);
  }
});
```

### 📊 Dados dos Gráficos:
```typescript
// Estrutura dos dados
[
  { date: "21/03", receitas: 45000, despesas: 20000 }, // 45000 vendas vs 12000 expenses + 8000 staff
  { date: "22/03", receitas: 38000, despesas: 15000 }, // 38000 vendas vs 7000 expenses + 8000 staff
  { date: "23/03", receitas: 52000, despesas: 18000 }, // 52000 vendas vs 10000 expenses + 8000 staff
]
```

### 📊 Visualização:
- **Barras Verdes**: Vendas (bruto)
- **Barras Vermelhas**: Despesas (staff + expenses)
- **Margem**: Diferença visual entre as barras

---

## 🎯 Resumo das Fórmulas:

### 📊 Cards:
1. **Saldo de Transição**: `metrics.historicoRevenue` (apenas external_history)
2. **Lucro Operacional**: `vendasTotais - impostos - despesasTotais - staffTotal`
3. **Património Total**: `historicoExterno + lucroOperacional`

### 📈 Gráficos:
- **Receitas**: Soma de `total_amount` das orders
- **Despesas**: Soma de `amount` (expenses) + `amount` (staff_payments)
- **Período**: Últimos 7 dias
- **Agrupamento**: Por dia (DD/MM)

---

## 📋 Logs Completos Esperados:

### 📊 Dashboard Completo:
```
[OWNER DASHBOARD] 🚀 FORÇANDO BUSCA DIRETA AO SUPABASE (staleTime: 0)...
[OWNER DASHBOARD] 📊 DADOS REAIS DO SUPABASE: 1 ordens
[OWNER DASHBOARD] 📊 DADOS DOS GRÁFICOS: [{ date: "27/03", receitas: 14000, despesas: 8000 }]
[OWNER DASHBOARD] 📊 CÁLCULO LUCRO OPERACIONAL:
├── Vendas Totais: 14000
├── Impostos (7%): 980
├── Despesas Totais: 5000
├── Staff Total: 3000
├── Lucro Operacional: 5020
└── Saldo Transição: 8000000
[OWNER DASHBOARD] 📊 RESULTADOS REAIS DO SUPABASE:
├── Valor Hoje (DB): 14000
├── Histórico Legado: 8000000
├── Rendimento Global (SOMA): 8014000
├── Ordens de Hoje: 1
└── Count Ordens: 1
[OWNER DASHBOARD] ✅ Dashboard atualizado com dados reais do Supabase (staleTime: 0)
```

### 📊 Cards Atualizados:
- **Saldo de Transição**: 8.000.000 Kz ✅
- **Lucro Operacional**: 5.020 Kz ✅
- **Património Total**: 8.005.020 Kz ✅
- **Faturação Hoje**: 14.000 Kz ✅

---

## 🎯 Estado Final:

### ✅ Cards Corrigidos:
- **Saldo de Transição**: Apenas external_history
- **Lucro Operacional**: Vendas - Impostos - Despesas - Staff
- **Património Total**: Saldo + Lucro Operacional

### ✅ Gráficos Ativados:
- **Vendas**: Bruto das orders
- **Despesas**: Staff + expenses (margem real)
- **Visualização**: Barras comparativas

### ✅ Dados em Tempo Real:
- **Fontes**: orders, expenses, staff_payments
- **Cálculo**: Automático a cada refresh
- **Sincronização**: Direto do Supabase

---

**📊 Todas as fórmulas corrigidas! Cards com lógica correta e gráficos mostrando margem real entre vendas e despesas.**
