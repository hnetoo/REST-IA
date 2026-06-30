# RELATÓRIO DE MELHORIAS — APP GERAL + MENU COMPRAS

## 📊 ANÁLISE GERAL DA APP

### Estado atual (45 views identificadas):
- **POS** — Funcional, com fecho de dia corrigido e automação implementada
- **DashboardV2** — Integrado com motor sync, gráficos recharts
- **Inventory** — Gestão de produtos, categorias, stock, QR
- **Employees** — Gestão de staff, turnos, salários, recibos
- **Reports** — 11 relatórios com export PDF
- **ProfitCenter** — Centro de lucro com gráficos
- **Purchases** — Pedidos de compra com aprovação WhatsApp
- **Events** — Gestão de eventos
- **Settings** — Configurações, SAFT, usuários
- **AGT** — Conformidade fiscal (config + control)
- **Certification** — Certificação AGT
- **Kitchen** — Cozinha
- **Customers** — Clientes
- **Marketing** — Marketing
- **Reservations** — Reservas
- **Analytics/PerformanceAnalytics** — Analytics

### O que funciona bem:
- Motor sync centralizado (`useSyncCore`)
- Sincronização em tempo real
- Fecho de dia com automação
- Conformidade fiscal AGT
- Relatórios com PDF
- Persistência offline (SQLite local)

---

## 🔍 PROBLEMAS IDENTIFICADOS NO MENU COMPRAS (Purchases.tsx)

### 1. UI/UX desatualizada
- Layout em lista simples sem cards visuais
- Sem dashboard/resumo no topo (total pendente, aprovado, pago)
- Sem ordenação visual por prioridade ou valor
- Filtros básicos (só por status)
- Sem busca por texto (descrição/fornecedor)
- Sem paginação ou scroll virtualizado

### 2. Funcionalidades em falta
- **Sem categoria de compra** (material de escritório, alimentos, equipamento, etc.)
- **Sem data prevista de entrega**
- **Sem quantidade/unidade** (só valor total)
- **Sem histórico de alterações** (auditoria)
- **Sem notificação in-app** quando aprovado/rejeitado
- **Sem marcação como "pago"** manual na app (só via WhatsApp)
- **Sem registo automático em expenses** quando aprovado
- **Sem upload de recibo/comprovativo** após pagamento
- **Sem gráfico de gastos** por mês/fornecedor

### 3. Integrações em falta
- Não regista em `cash_flow` quando compra é paga
- Não sincroniza com `expenses` automaticamente
- Não atualiza stock quando compra é recebida
- Não notifica o motor sync (`recalculate`) em todas as ações

### 4. Pequenos bugs
- `amount` vs `amount_kz` — interface tem ambos mas usa `amount` no insert
- `approval_token` gerado no frontend em vez de usar o trigger do DB
- `created_by` e `approved_by` não são enviados no insert
- `notes` existe no schema mas não é usado no formulário
- URL de aprovação hardcoded para `rest-ia.vercel.app`

---

## 🎯 PROPOSTAS DE MELHORIAS (para aprovação)

### MELHORIA 1: Dashboard Resumo no Topo (Prioridade ALTA)

**O que:** Adicionar cards de resumo no topo da página com:
- Total Pendente (valor + quantidade)
- Total Aprovado Aguardando Pagamento
- Total Pago no Mês
- Total Rejeitado

**Impacto visual:** Moderniza imediatamente a página
**Complexidade:** Baixa

---

### MELHORIA 2: Cards visuais em vez de lista (Prioridade ALTA)

**O que:** Substituir a lista simples por cards modernos com:
- Ícone/cores por status
- Descrição em destaque
- Valor, fornecedor e data em grid
- Badges de status animados
- Botões de ação inline (hover)
- Sombras e bordas arredondadas

**Impacto visual:** Página muito mais moderna e profissional
**Complexidade:** Baixa

---

### MELHORIA 3: Busca e Filtros Avançados (Prioridade MÉDIA)

**O que:** Adicionar:
- Barra de busca por texto (descrição, fornecedor)
- Filtro por período (data início/fim)
- Filtro por valor mínimo/máximo
- Ordenação por data, valor, status

**Complexidade:** Baixa

---

### MELHORIA 4: Campo de Categoria e Notas (Prioridade MÉDIA)

**O que:** Adicionar ao formulário:
- Campo `category` (select: Alimentos, Equipamento, Material de Escritório, Serviços, Outros)
- Campo `notes` (textarea para observações)
- Campo `expected_date` (data prevista de entrega)
- Campo `quantity` e `unit` (quantidade e unidade)

**Nota:** `notes` já existe no schema do Supabase. `category` pode ser armazenada em `notes` como metadados JSON ou adicionada como coluna nova.

**Complexidade:** Média (pode requerer migration se adicionar colunas)

---

### MELHORIA 5: Marcar como Pago + Upload de Recibo (Prioridade ALTA)

**O que:** Permitir ao operador:
- Marcar pedido aprovado como "pago" manualmente
- Fazer upload de recibo/comprovativo
- Isto regista automaticamente em `expenses` e `cash_flow` (type='saida')
- Recalcula o motor sync

**Complexidade:** Média

---

### MELHORIA 6: Gráfico de Gastos Mensais (Prioridade BAIXA)

**O que:** Adicionar gráfico de barras/área mostrando:
- Gastos por mês (últimos 6 meses)
- Gastos por fornecedor (top 5)
- Gastos por categoria

**Complexidade:** Média

---

### MELHORIA 7: Corrigir Bugs Existentes (Prioridade ALTA)

**O que:**
- Remover `approval_token` do frontend (o DB já tem trigger `set_approval_token`)
- Enviar `created_by` com o ID do utilizador atual
- Usar URL dinâmica em vez de hardcoded (`window.location.origin`)
- Garantir que `recalculate()` é chamado após cada ação (criar, aprovar, pagar)

**Complexidade:** Baixa

---

## 📋 PRIORIDADES RECOMENDADAS

| Ordem | Melhoria | Impacto | Esforço |
|---|---|---|---|
| 1ª | MELHORIA 7 — Corrigir bugs | Alto | Baixo |
| 2ª | MELHORIA 1 — Dashboard resumo | Alto | Baixo |
| 3ª | MELHORIA 2 — Cards visuais | Alto | Baixo |
| 4ª | MELHORIA 5 — Marcar como pago + recibo | Alto | Médio |
| 5ª | MELHORIA 3 — Busca e filtros | Médio | Baixo |
| 6ª | MELHORIA 4 — Categoria e notas | Médio | Médio |
| 7ª | MELHORIA 6 — Gráfico de gastos | Baixo | Médio |

---

## 🚀 IMPLEMENTAÇÃO RECOMENDADA (FASES)

### FASE 1 (Imediato):
- MELHORIA 7: Corrigir bugs
- MELHORIA 1: Dashboard resumo no topo
- MELHORIA 2: Cards visuais modernos

### FASE 2 (Próxima):
- MELHORIA 5: Marcar como pago + upload recibo + sync expenses
- MELHORIA 3: Busca e filtros avançados

### FASE 3 (Médio prazo):
- MELHORIA 4: Categoria, notas, data prevista
- MELHORIA 6: Gráfico de gastos

---

## ⚠️ O QUE NÃO MUDAR
- Lógica de aprovação via WhatsApp (funciona)
- Estrutura da tabela `purchase_requests` no Supabase
- Integração com `useSyncCore` (já funciona)
- Configurações de WhatsApp em localStorage

---

## ✅ APROVAÇÃO

Para prosseguir, favor aprovar quais melhorias implementar:

- [ ] MELHORIA 1 — Dashboard resumo no topo
- [ ] MELHORIA 2 — Cards visuais modernos
- [ ] MELHORIA 3 — Busca e filtros avançados
- [ ] MELHORIA 4 — Campo de categoria e notas
- [ ] MELHORIA 5 — Marcar como pago + upload recibo
- [ ] MELHORIA 6 — Gráfico de gastos mensais
- [ ] MELHORIA 7 — Corrigir bugs existentes

**Comentários do gestor:** _________________________________________________

---

*Documento criado em 20/06/2026 para aprovação antes de implementação.*
