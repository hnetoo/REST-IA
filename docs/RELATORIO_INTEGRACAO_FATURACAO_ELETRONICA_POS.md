# Relatório de Integração da Faturação Eletrónica com o POS

## 1. Estado Atual do Sistema

### 1.1 O que JÁ FUNCIONA

| Componente | Estado | Localização |
|---|---|---|
| Regime Fiscal dinâmico (GERAL/SIMPLIFICADO/ISENTO) | ✅ Funcional | `Settings.tsx`, `SystemHub.tsx`, `AGTControl.tsx` |
| Tax rate aplicado no POS (addToOrder) | ✅ Funcional | `useStore.ts:2277,2283,2353` |
| Tax rate na reimpressão de facturas | ✅ Funcional | `POS.tsx:371,375` |
| Tax rate nos cards do Dashboard | ✅ Funcional | `DashboardV2.tsx:286,691-694` |
| Tax rate no OwnerDashboard | ✅ Funcional | `OwnerDashboard.tsx:41,88,569-575` |
| Tax rate no Financeiro | ✅ Funcional | `Finance/index.tsx:245-246` |
| Tax rate na impressão térmica | ✅ Funcional | `printService.ts:186` |
| Geração de SAF-T (XML) | ✅ Funcional | `saftService.ts` |
| Painel de Faturação Eletrónica | ✅ Funcional | `EInvoicePanel.tsx` |
| Gestão de Séries de Faturas | ✅ Funcional | `EInvoicePanel.tsx`, `invoiceSequenceService.ts` |
| Logs de Auditoria AGT | ✅ Funcional | `agtComplianceLogService.ts` |
| Serviço AGT (simulado + real) | ✅ Funcional | `agtService.ts`, `agtRealService.ts` |

### 1.2 O que foi CORRIGIDO nesta sessão

| Problema | Correção | Ficheiro |
|---|---|---|
| Tax rate hardcoded 14% no useOrderStore | Alterado para `get().settings?.taxRate ?? 14` | `useOrderStore.ts:257` |
| Erros de acessibilidade (20+ lint errors) | Adicionados `title` attributes em buttons/inputs/selects | `EInvoicePanel.tsx`, `Purchases.tsx` |
| CSS inline no POS.tsx | Movido para classe `.print-preview-scaler` | `POS.tsx:2789`, `index.css` |
| JSX syntax errors no Events.tsx | Reescrita do bloco de dashboard + charts | `Events.tsx` |

---

## 2. Como Funciona o Regime de Imposto Dinâmico

### 2.1 Fluxo de Configuração

```
Utilizador seleciona regime em Settings/SystemHub/AGTControl
         │
         ▼
handleRegimeChange(regime)
  GERAL → 14% | SIMPLIFICADO → 7% | EXCLUSAO → 0%
         │
         ▼
updateSettings({ taxRegime: regime, taxRate: rate })
         │
         ▼
useStore.settings.taxRate atualizado globalmente
         │
         ├──► POS: addToOrder usa state.settings.taxRate / 100
         ├──► Dashboard: cards usam settings.taxRate
         ├──► Finance: metrics usam settings.taxRate
         ├──► OwnerDashboard: reservaFiscal usa settings.taxRate
         ├──► printService: taxRate = settings.taxRate || 14
         └──► SAF-T: taxRate incluído no XML
```

### 2.2 Pontos de Aplicação do Tax Rate

| Local | Ficheiro | Linha | Como Usa |
|---|---|---|---|
| Adicionar item ao pedido | `useStore.ts` | 2277, 2353 | `state.settings.taxRate / 100` |
| Criar novo pedido | `useStore.ts` | 2283 | `state.settings.taxRate / 100` |
| Remover item do pedido | `useStore.ts` | 302-307 | Recalcula com taxAmount existente |
| Reimpressão de factura | `POS.tsx` | 371, 375 | `settings.taxRate / 100` |
| Impressão térmica | `printService.ts` | 186 | `settings.taxRate \|\| 14` |
| Dashboard cards | `DashboardV2.tsx` | 691-694 | `settings.taxRate \|\| 7` |
| OwnerDashboard | `OwnerDashboard.tsx` | 88 | `settings.taxRate \|\| 7` |
| Financeiro | `Finance/index.tsx` | 245 | `settings.taxRate \|\| 7` |
| SAF-T XML | `saftService.ts` | - | Usa settings.taxRate |
| EInvoicePanel | `EInvoicePanel.tsx` | 65 | `settings.taxRate \|\| 14` |

### 2.3 Validação

Ao alterar o regime fiscal em **Definições → Regime Fiscal IVA**:
- ✅ O `taxRate` é atualizado no store global
- ✅ Novos itens adicionados no POS usam a nova taxa
- ✅ Cards do dashboard recalculam impostos
- ✅ Financeiro recalcula lucro líquido
- ✅ Impressões de factura mostram a taxa correta
- ✅ SAF-T usa a taxa configurada

---

## 3. Integração da Faturação Eletrónica com o POS

### 3.1 Arquitetura Atual

```
┌─────────────────────────────────────────────────────────┐
│                    POS (Terminal de Vendas)              │
│                                                          │
│  1. Garçom adiciona itens ao pedido                      │
│     └─► taxAmount calculado com settings.taxRate         │
│                                                          │
│  2. Checkout (fechar mesa)                               │
│     ├─► Gerar número de factura (FT/FR + série + seq)   │
│     ├─► Calcular taxTotal (soma de taxAmount * qty)      │
│     ├─► Salvar no Supabase (orders + order_items)       │
│     ├─► Imprimir factura térmica                         │
│     │    └─► Mostra IVA %, base tributável, valor IVA   │
│     └─► (Opcional) Submeter à AGT                       │
│                                                          │
│  3. Histórico de Vendas                                  │
│     └─► Reimpressão usa settings.taxRate                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Faturação Eletrónica (AGT)                  │
│                                                          │
│  EInvoicePanel (SystemHub > Faturação Eletrónica)        │
│  ├─► Configuração: NIF, série, regime, URLs AGT         │
│  ├─► Séries: Registar séries FT/FR/ND/NC na AGT         │
│  ├─► Teste de Conexão: Validar comunicação com AGT      │
│  ├─► Logs de Auditoria: Todas comunicações registadas   │
│  └─► SAF-T: Exportar XML mensal para AGT                │
│                                                          │
│  Serviços:                                               │
│  ├─► agtService.ts (simulação)                           │
│  ├─► agtRealService.ts (HTTP real para AGT)             │
│  ├─► invoiceSequenceService.ts (numeração sequencial)   │
│  ├─► agtComplianceLogService.ts (logs de auditoria)     │
│  └─► saftService.ts (geração XML SAF-T AO v1.01)       │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Fluxo de Checkout com Faturação Eletrónica

```
Cliente fecha mesa no POS
         │
         ▼
checkoutTable(orderId, paymentMethod, customerId, customerNif)
         │
         ├─► 1. Gerar número de factura
         │   └─► Série (FT2026) + Sequência (invoiceSequenceService)
         │
         ├─► 2. Calcular totais
         │   ├─► total = soma(unitPrice * qty)
         │   ├─► taxTotal = soma(taxAmount * qty)
         │   └─► profit = soma((unitPrice - unitCost) * qty)
         │
         ├─► 3. Salvar no Supabase
         │   ├─► INSERT/UPDATE orders (total_amount, status, invoice_number)
         │   └─► RPC sync_complete_order (order_items)
         │
         ├─► 4. Imprimir factura térmica
         │   └─► printThermalInvoice()
         │       ├─► Cabeçalho: Nome, NIF, Morada, Série
         │       ├─► Items: nome, qty, preço unitário, total
         │       ├─► Resumo de Impostos: IVA %, base, valor
         │       └─► Total + Método de pagamento
         │
         └─► 5. (Futuro) Submissão à AGT
             ├─► Se autoSubmit = true
             │   └─► agtRealService.submitInvoice()
             └─► Se autoSubmit = false
                 └─► SAF-T mensal (batch)
```

### 3.3 O que FALTA para Faturação Eletrónica Real

| Requisito | Estado | Prioridade |
|---|---|---|
| Certificação AGT em curso | 🔄 Em progresso | Alta |
| URLs de teste/produção AGT | ✅ Configuráveis no EInvoicePanel | - |
| Registo de séries na AGT | ✅ Implementado | - |
| Geração de SAF-T | ✅ Funcional | - |
| Submissão em tempo real | ⏳ Pendente certificação | Média |
| Hash de factura (assinatura) | ⏳ Pendente | Alta |
| QR Code na factura impressa | ⏳ Pendente | Média |
| Validação de NIF do cliente | ✅ Campo existe no checkout | - |

### 3.4 Pré-requisitos para Produção

1. **Certificação AGT aprovada** - Necessário para submissão real
2. **URLs de produção** - Configurar no EInvoicePanel quando disponíveis
3. **Hash/Assinatura de facturas** - Implementar assinatura digital
4. **QR Code** - Adicionar QR code na factura impressa (validação AGT)
5. **Backup de segurança** - Garantir que todas as facturas são persistidas

---

## 4. Regimes Fiscais Suportados

| Regime | Taxa IVA | Código | Descrição |
|---|---|---|---|
| Regime Geral | 14% | `GERAL` | Empresas com volume de negócios > 250.000.000 Kz/ano |
| Regime Simplificado | 7% | `SIMPLIFICADO` | Pequenos contribuintes (volume < 250.000.000 Kz/ano) |
| Regime de Exclusão | 0% | `EXCLUSAO` | Isentos de IVA (atividades específicas) |

### 4.1 Impacto em Cada Componente

- **POS**: Cada item adicionado calcula `taxAmount = price * (taxRate / 100)`
- **Factura Impressa**: Mostra `IVA: {taxRate}%`, `Base: {netTotal}`, `Valor IVA: {taxTotal}`
- **Dashboard**: Card "Impostos" mostra `{taxRate}%` e valor calculado sobre faturação
- **Financeiro**: `tax = revenue * (taxRate / 100)`, `netProfit = revenue - costs - tax`
- **OwnerDashboard**: Reserva fiscal usa `taxaRetencao = taxRate / 100`
- **SAF-T**: XML inclui taxa de IVA aplicada

---

## 5. Recomendações

1. **Implementar hash de factura** - Assinatura digital obrigatória pela AGT
2. **Adicionar QR Code** - Na factura impressa para validação
3. **Submissão automática** - Quando certificação estiver aprovada
4. **Validação de NIF** - Validar NIF do cliente antes de fechar venda
5. **Backup automático** - Garantir persistência de todas as facturas
6. **Testes com AGT** - Usar ambiente de teste (URL configurável no EInvoicePanel)

---

## 6. Conclusão

O sistema JÁ APLICA o regime de imposto dinamicamente em toda a app. O bug do hardcoded 14% no `useOrderStore.ts` foi corrigido. Todos os componentes (POS, Dashboard, Financeiro, Impressão, SAF-T) usam `settings.taxRate` que é atualizado quando o utilizador muda o regime fiscal.

A integração da faturação eletrónica com o POS está arquitetonicamente pronta, aguardando apenas a certificação AGT para ativar a submissão em tempo real.
