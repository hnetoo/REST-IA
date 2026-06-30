# Relatório: Modificação do Card "Vendas por Produtos"

## Objetivo
Modificar o card "Vendas por Produtos Hoje" no Analytics para:
1. Alterar título para "Venda por Produto"
2. Permitir visualização por período: **Hoje** (padrão), **Últimos 7 dias**, **Mensal**
3. Manter "Hoje" sempre como visualização principal

## Análise do Código Atual

### Localização
- Arquivo: `src/views/Analytics.tsx`
- Card atual: linhas 579-605
- Lógica de cálculo: `dailyProductSales` (useMemo, linhas 202-229)

### Funcionamento Atual
O `dailyProductSales` calcula vendas apenas do dia atual:
1. Busca orders com `data_contabil = hoje`
2. Filtra order_items dessas orders
3. Agrupa por produto (nome)
4. Ordena por valor total (descendente)

## Solução Proposta

### 1. Estrutura de Estado
Adicionar estado local no componente para controlar o período:
```typescript
const [productPeriod, setProductPeriod] = useState<'today' | 'week' | 'month'>('today');
```

### 2. Modificar a Lógica de Cálculo
Substituir `dailyProductSales` por `productSalesByPeriod` que aceita o período como parâmetro:

```typescript
const productSalesByPeriod = useMemo(() => {
  const productMap: Record<string, { name: string; quantity: number; totalValue: number }> = {};
  
  // Determinar quais orders incluir baseado no período
  let relevantOrderIds: Set<string>;
  
  if (productPeriod === 'today') {
    // Orders de hoje (já filtrado por data_contabil no realtimeOrders)
    relevantOrderIds = new Set(realtimeOrders.map(o => o.id));
  } else if (productPeriod === 'week') {
    // Buscar orders dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    relevantOrderIds = new Set(
      realtimeOrders.filter(o => new Date(o.created_at) >= sevenDaysAgo).map(o => o.id)
    );
  } else {
    // Buscar orders do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    relevantOrderIds = new Set(
      realtimeOrders.filter(o => new Date(o.created_at) >= startOfMonth).map(o => o.id)
    );
  }
  
  // Resto da lógica permanece igual...
  orderItems.forEach((item: any) => {
    if (!relevantOrderIds.has(item.order_id)) return;
    // ... processamento dos items
  });
  
  return Object.values(productMap).sort((a, b) => b.totalValue - a.totalValue);
}, [orderItems, realtimeOrders, menu, productPeriod]);
```

### 3. Interface do Card
Adicionar tabs/seletor de período no header do card:

```tsx
<div className="glass-panel p-8 rounded-2xl border border-white/5">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-lg font-bold text-white flex items-center gap-3">
      <ShoppingCart size={20} className="text-[#10b981]" />
      Venda por Produto
    </h3>
    
    {/* Seletor de Período */}
    <div className="flex gap-2">
      {[
        { key: 'today', label: 'Hoje' },
        { key: 'week', label: '7 Dias' },
        { key: 'month', label: 'Mensal' }
      ].map((period) => (
        <button
          key={period.key}
          onClick={() => setProductPeriod(period.key as any)}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
            productPeriod === period.key
              ? 'bg-[#10b981] text-white'
              : 'bg-white/10 text-slate-400 hover:bg-white/20'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  </div>
  
  {/* Lista de produtos */}
  <div className="space-y-3">
    {productSalesByPeriod.length === 0 ? (
      <div className="text-center text-slate-500 py-10 italic">
        Nenhuma venda no período selecionado
      </div>
    ) : (
      productSalesByPeriod.map((product: any, index: number) => (
        // ... renderização dos produtos
      ))
    )}
  </div>
</div>
```

### 4. Otimização de Performance
Para períodos maiores (7 dias, mensal), o `realtimeOrders` atual pode não ter dados suficientes pois só busca o dia atual. Opções:

**Opção A (Recomendada):** Buscar dados adicionais quando o usuário selecionar outro período
- Adicionar função `fetchExtendedOrders(days: number)`
- Chamar quando mudar de "Hoje" para outro período
- Cache dos dados para não buscar repetidamente

**Opção B:** Usar dados locais do Zustand (`activeOrders`)
- O `activeOrders` já tem histórico de orders
- Filtrar por data no client-side
- Menos preciso mas mais rápido

## Implementação Recomendada (Opção A)

### Passos:
1. Adicionar estado `productPeriod`
2. Adicionar estado `extendedOrders` e `extendedOrderItems` para cache
3. Criar função `fetchProductSalesData(period: string)`
4. Modificar o useMemo para usar dados estendidos quando necessário
5. Atualizar o JSX do card com tabs

### Vantagens:
- Dados precisos de qualquer período
- Performance otimizada com cache
- UX fluida com tabs visuais

### Trade-offs:
- Requer chamadas adicionais ao Supabase
- Complexidade maior no código

## Implementação Alternativa (Opção B - Simples)

Usar apenas `activeOrders` do Zustand que já tem dados históricos:

```typescript
const productSalesByPeriod = useMemo(() => {
  const productMap: Record<string, { name: string; quantity: number; totalValue: number }> = {};
  
  // Usar activeOrders em vez de realtimeOrders
  let relevantOrders = activeOrders.filter(o => ['closed', 'paid'].includes(o.status));
  
  if (productPeriod === 'today') {
    const hojeString = calculateDataContabil(new Date());
    relevantOrders = relevantOrders.filter(o => {
      const orderDate = o.timestamp ? new Date(o.timestamp).toISOString().split('T')[0] : '';
      return orderDate === hojeString;
    });
  } else if (productPeriod === 'week') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    relevantOrders = relevantOrders.filter(o => 
      o.timestamp && new Date(o.timestamp) >= sevenDaysAgo
    );
  } else {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    relevantOrders = relevantOrders.filter(o => 
      o.timestamp && new Date(o.timestamp) >= startOfMonth
    );
  }
  
  // Iterar sobre as orders e seus items
  relevantOrders.forEach(order => {
    order.items?.forEach((item: any) => {
      const name = item.dish?.name || 'Desconhecido';
      if (!productMap[name]) {
        productMap[name] = { name, quantity: 0, totalValue: 0 };
      }
      productMap[name].quantity += item.quantity || 0;
      productMap[name].totalValue += (item.quantity || 0) * (item.unitPrice || 0);
    });
  });
  
  return Object.values(productMap).sort((a, b) => b.totalValue - a.totalValue);
}, [activeOrders, productPeriod]);
```

### Vantagens Opção B:
- Sem chamadas adicionais ao Supabase
- Mais simples de implementar
- Usa dados já carregados

### Desvantagens:
- Depende de `activeOrders` ter dados completos
- Pode não refletir vendas muito recentes (se não sincronizado)

## Decisão
Recomendo implementar a **Opção B (Simples)** primeiro, pois:
1. Mais rápida de implementar
2. Usa dados existentes
3. Suficiente para a maioria dos casos
4. Se necessário, evoluir para Opção A depois

## Próximos Passos
1. Implementar estado `productPeriod`
2. Criar lógica de filtro por período usando `activeOrders`
3. Adicionar tabs de seleção no card
4. Atualizar título
5. Testar comportamento
