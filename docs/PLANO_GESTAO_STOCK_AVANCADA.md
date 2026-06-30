# PLANO DE IMPLEMENTAÇÃO — GESTÃO DE STOCK AVANÇADA

**Versão:** 1.0  
**Data:** 26/06/2026  
**Projecto:** REST IA OS v1.1.2 — Tasca do Vereda  

---

## 1. ANÁLISE DO SISTEMA ACTUAL

### O que já existe:
- **Tab "Stock & Inventário"** no Inventory.tsx com:
  - Cards de resumo (Esgotados, Stock Baixo, Stock OK, Valor Total)
  - Filtro por categoria
  - Lista de produtos com botões +/- e ajuste manual
  - Relatório de stock imprimível (HTML simples)
- **stockMovementService.ts** com:
  - Registo de movimentos (ENTRADA, SAIDA, AJUSTE, VENDA, DEVOLUCAO)
  - Busca de movimentos por produto e por período
  - Registo automático de saída na venda (checkout)
- **Tabela `stock_movements`** no Supabase
- **Campos no produto:** `stock_quantity`, `min_stock`, `unit`, `sku`, `cost_price`

### O que falta:
1. **Dashboard de Stock Avançado** com métricas em tempo real
2. **Histórico de Movimentos** visual (não há UI para ver movimentos)
3. **Entradas de Stock** (compras a fornecedores) com UI dedicada
4. **Inventário Físico** (contagem cíclica com reconciliação)
5. **Alertas Automáticos** configuráveis (notificações push)
6. **Previsão de Consumo** (média diária, dias até esgotar)
7. **Fornecedores** e gestão de compras
8. **Lotes e Validades** (para produtos perecíveis)
9. **Relatórios Avançados** (valor stock, curva ABC, rotação)
10. **Custo Médio Ponderado** (CMP) automático

---

## 2. ARQUITECTURA PROPOSTA

### 2.1 Novas Tabelas no Supabase

```sql
-- Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nif TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Compras a fornecedores
CREATE TABLE IF NOT EXISTS stock_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING', -- PENDING, RECEIVED, CANCELLED
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Itens de compra
CREATE TABLE IF NOT EXISTS stock_purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES stock_purchases(id) ON DELETE CASCADE,
  product_id UUID,
  quantity NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  expiry_date DATE,
  lot_number TEXT
);

-- Inventário físico (contagem)
CREATE TABLE IF NOT EXISTS stock_inventories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'OPEN', -- OPEN, COUNTED, RECONCILED
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do inventário físico
CREATE TABLE IF NOT EXISTS stock_inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES stock_inventories(id) ON DELETE CASCADE,
  product_id UUID,
  system_quantity NUMERIC(10,2) NOT NULL,
  counted_quantity NUMERIC(10,2),
  difference NUMERIC(10,2) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  notes TEXT
);

-- Alertas de stock configuráveis
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID,
  alert_type TEXT NOT NULL, -- LOW_STOCK, OUT_OF_STOCK, EXPIRY_SOON, OVERSTOCK
  threshold NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Novos Ficheiros

```
src/
├── views/
│   └── StockManagement/
│       ├── index.tsx              → Dashboard principal de stock
│       ├── StockDashboard.tsx     → Métricas e KPIs em tempo real
│       ├── StockMovements.tsx     → Histórico de movimentos com filtros
│       ├── StockPurchases.tsx     → Compras a fornecedores (entrada)
│       ├── StockInventory.tsx     → Inventário físico (contagem)
│       ├── StockReports.tsx       → Relatórios avançados
│       └── StockSuppliers.tsx     → Gestão de fornecedores
├── lib/
│   └── stockAdvancedService.ts    → Lógica de negócio (CMP, previsões, ABC)
├── hooks/
│   └── useStockAdvanced.ts        → Hook com dados de stock em tempo real
```

---

## 3. FUNCIONALIDADES DETALHADAS

### 3.1 Dashboard de Stock Avançado
- **KPIs em tempo real:** Total produtos, Valor stock (preço venda), Valor stock (custo), Produtos críticos
- **Gráfico de consumo** (últimos 7/30 dias) — barras por dia
- **Top 5 produtos** com stock crítico (vermelho)
- **Top 5 produtos** mais vendidos (rotação)
- **Previsão de esgotamento** — dias restantes por produto
- **Curva ABC** — classificação automática (A: 80% valor, B: 15%, C: 5%)

### 3.2 Movimentos de Stock
- **Tabela paginada** com todos os movimentos
- **Filtros:** produto, tipo (ENTRADA/SAIDA/AJUSTE/VENDA/DEVOLUCAO), data, utilizador
- **Exportar CSV/PDF**
- **Registo automático** em todas as operações (venda, compra, ajuste, inventário)

### 3.3 Compras a Fornecedores (Entradas)
- **Criar compra:** seleccionar fornecedor, data, factura
- **Adicionar itens:** produto, quantidade, custo unitário, validade, lote
- **Receber compra:** actualiza stock automaticamente + regista movimento ENTRADA
- **Cancelar compra:** reverte stock se já recebida
- **Histórico de compras** com estado (Pendente, Recebida, Cancelada)

### 3.4 Inventário Físico (Contagem)
- **Iniciar contagem:** sistema regista quantidades actuais
- **Contagem cega** (opcional): esconde quantidade do sistema
- **Registar contagem:** input por produto ou scanner de código
- **Reconciliação:** mostra diferenças (sistema vs contado)
- **Aplicar ajustes:** actualiza stock + regista movimento AJUSTE
- **Relatório de divergências**

### 3.5 Alertas Automáticos
- **Stock baixo:** notificação quando stock ≤ min_stock
- **Esgotado:** notificação urgente quando stock = 0
- **Validade próxima:** aviso X dias antes de expirar
- **Overstock:** aviso quando stock > 2x min_stock (excesso)
- **Configurável por produto** ou global

### 3.6 Previsão de Consumo
- **Média diária** de consumo (baseado em vendas dos últimos 7/30 dias)
- **Dias até esgotar** = stock_actual / média_diária
- **Sugestão de reposição** = min_stock * 2 - stock_actual
- **Gráfico de tendência** (consumo ao longo do tempo)

### 3.7 Custo Médio Ponderado (CMP)
- Calculado automaticamente em cada entrada de stock
- `CMP = (stock_actual * custo_actual + entrada * custo_novo) / (stock_actual + entrada)`
- Usado para cálculo de margem real e valor de stock

### 3.8 Relatórios Avançados
1. **Relatório de Valor de Stock** (preço venda vs custo vs margem)
2. **Curva ABC** (classificação por valor)
3. **Rotação de Stock** (quantas vezes o stock se renovou no período)
4. **Relatório de Movimentos** (entradas, saídas, ajustes por período)
5. **Relatório de Divergências** (inventário físico)
6. **Relatório de Produtos Parados** (sem movimento no período)
7. **Relatório de Validades** (produtos próximos de expirar)

---

## 4. UI/UX PROPOSTA

### Design:
- **Tema:** Petroleum Green (igual ao resto do app)
- **Glass panels** com bordas subtis
- **Cards de KPI** com ícones e cores semânticas
- **Tabelas** com ordenação e paginação
- **Modais** para criar/editar compras, inventários
- **Notificações** via addNotification existente
- **Responsive** — funciona em tablet e desktop

### Navegação:
- Novo item no menu lateral: **"Gestão de Stock"** (ícone: Boxes/Package)
- Sub-tabs dentro da view:
  1. Dashboard
  2. Movimentos
  3. Compras
  4. Inventário
  5. Fornecedores
  6. Relatórios

---

## 5. INTEGRAÇÃO COM SISTEMA ACTUAL

### Pontos de integração:
- **POS checkout:** já regista `registerStockMovementsForSale` — manter
- **Inventory.tsx:** tab "Stock & Inventário" actual → substituir por link para nova view
- **SalesControl:** já tem análise de stock — complementar com dados de CMP
- **DashboardV2:** adicionar widget de stock crítico
- **useStore:** adicionar estado de stock avançado (fornecedores, compras)

###Compatibilidade:
- **Offline-first:** todas as operações funcionam offline com sync posterior
- **Supabase RLS:** políticas para stock_movements, suppliers, purchases
- **Electron:** sem dependências nativas adicionais

---

## 6. CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1 — Fundação (2-3 dias)
- [ ] Criar tabelas no Supabase (suppliers, purchases, inventories, alerts)
- [ ] Criar `stockAdvancedService.ts` (CMP, previsões, ABC)
- [ ] Criar `useStockAdvanced` hook
- [ ] Migrar tab "Stock" do Inventory.tsx para nova view

### Fase 2 — Dashboard + Movimentos (2 dias)
- [ ] StockDashboard com KPIs e gráficos
- [ ] StockMovements com filtros e exportação
- [ ] Integração com movimentos existentes

### Fase 3 — Compras + Fornecedores (2-3 dias)
- [ ] CRUD de fornecedores
- [ ] Criar/receber/cancelar compras
- [ ] Actualização automática de stock + CMP

### Fase 4 — Inventário Físico (2 dias)
- [ ] Iniciar contagem
- [ ] Registar contagem
- [ ] Reconciliação e ajustes

### Fase 5 — Relatórios + Alertas (2 dias)
- [ ] 7 relatórios avançados
- [ ] Sistema de alertas automáticos
- [ ] Widget no DashboardV2

### **Total estimado:** 10-12 dias úteis

---

## 7. BENEFÍCIOS ESPERADOS

| Métrica | Antes | Depois |
|---------|-------|--------|
| Visibilidade de stock | Lista simples | Dashboard com KPIs |
| Rastreabilidade | Movimentos gravados | UI completa de movimentos |
| Compras | Não existe | Sistema completo de compras |
| Inventário físico | Não existe | Contagem cíclica com reconciliação |
| Previsão de consumo | Manual | Automática com sugestões |
| Custo de stock | Preço de venda | CMP + margem real |
| Alertas | Notificação básica | Configurável por produto |
| Relatórios | 1 (stock simples) | 7 relatórios avançados |
| Curva ABC | Não existe | Classificação automática |

---

## 8. RISCOS E MITIGAÇÕES

| Risco | Mitigação |
|-------|-----------|
| Tabelas novas no Supabase | Script SQL testado + backup antes |
| Performance com muitos movimentos | Paginação + índices + cache |
| Offline-first | Fila de sync para compras/inventário |
| Migração de dados | Migrar stock_quantity existente sem perda |
| RLS policies | Definir políticas antes de usar tabelas |

---

**Aprovação necessária para iniciar implementação.**
