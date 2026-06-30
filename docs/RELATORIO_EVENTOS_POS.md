# RELATÓRIO — EVENTOS & POS: ESTADO ACTUAL E PLANO DE MODERNIZAÇÃO

**Versão:** 1.0  
**Data:** 26/06/2026  
**Projecto:** REST IA OS v1.1.2 — Tasca do Vereda  

---

## 1. ESTADO ACTUAL DO MÓDULO DE EVENTOS

### O que existe e funciona:

**Gestão de Eventos (`Events.tsx` — 3131 linhas):**
- CRUD completo de eventos (criar, editar, ver detalhes, apagar)
- Tipos: ANIVERSARIO, CASAMENTO, CORPORATIVO, SHOW_INTIMISTA, ALUGUER_TOTAL, ALUGUER_PARCIAL, BATIZADO, OUTRO
- Status: PLANEADO → CONFIRMADO → EM_ANDAMENTO → CONCLUIDO / CANCELADO
- Dashboard com KPIs (hoje, 7 dias, pendentes, confirmados, receita total, alertas 48h)
- Gráficos (eventos por mês, tipos de evento)
- Vista de lista e calendário
- Filtros: texto, status, tipo, data
- Gestão de pacotes (packages) com itens incluídos, preços base e por pessoa
- Gestão de shows com cálculo de lucro (receitas vs despesas)
- Reserva de mesas (`pos_tables.event_id`, `event_reserved`)
- Cronograma automático por tipo de evento
- Verificação de conflitos de horário

**Serviço (`eventService.ts` — 1203 linhas):**
- `EventService` — CRUD eventos, reserva de mesas, pedidos vinculados
- `EventPackageService` — CRUD pacotes, cálculo de preço
- `ShowService` — Gestão de shows, despesas, receitas, cálculo de lucro
- `addOrderToEvent()` — vincula pedido do POS a um evento
- `getEventOrders()` — busca pedidos de um evento
- `removeOrderFromEvent()` — desvincula pedido
- `getEventFinancialSummary()` — resumo financeiro com consumo ilimitado

### Tabelas no Supabase:
- `events` — dados principais do evento
- `event_packages` — pacotes pré-definidos
- `event_orders` — vínculo entre pedidos do POS e eventos
- `show_expenses` — despesas de shows
- `show_revenue` — receitas de shows
- `pos_tables` — mesas com `event_id` e `event_reserved`

---

## 2. COMO OS EVENTOS SE LIGAM AO POS (ACTUALMENTE)

### A infraestrutura existe, MAS não está conectada na UI:

**O que JÁ existe no backend:**
- `event_orders` table liga `order_id` a `event_id`
- `orders` table tem campos `event_id`, `is_event_order`, `event_order_type`
- `EventService.addOrderToEvent()` faz a vinculação
- `consumption_mode` suporta `CONSUMO_POS` (vendas via POS durante evento)
- Mesas podem ser reservadas para eventos

**O que NÃO existe (a falha):**
- **POS não tem nenhum código de eventos** — zero referências a `event_id`, `EventService`, `addOrderToEvent` em `POS.tsx`
- **Não há selector de evento no POS** — o garçom não pode escolher "esta mesa pertence ao evento X"
- **Não há separação visual** — mesas reservadas para evento não mostram badge no POS
- **Checkout não vincula ao evento** — quando se faz checkout de uma mesa de evento, o pedido não é associado ao evento
- **Não há relatório de consumo por evento** — não se pode ver quanto foi vendido em cada evento
- **Pacotes não são aplicados** — itens incluídos no pacote não são carregados automaticamente
- **Consumo ilimitado não funciona** — não há controlo de "este item é ilimitado para este evento"

### Fluxo actual (quebrado):
```
1. Criar evento no Events.tsx → reserva mesas → define pacote
2. No POS, garçom abre a mesa reservada → NÃO vê que é de evento
3. Garçom adiciona itens → faz checkout → pedido vai para orders
4. Pedido NÃO é vinculado ao evento → extras_amount NÃO é actualizado
5. No Events.tsx → pedidos do evento aparecem vazios
```

### Fluxo pretendido (correcto):
```
1. Criar evento no Events.tsx → reserva mesas → define pacote
2. No POS, mesas de evento mostram badge "EVENTO: Aniversário João"
3. Garçom abre mesa → vê pacote incluído → pode adicionar extras
4. Checkout → pedido vinculado automaticamente ao evento
5. extras_amount actualizado em tempo real
6. Events.tsx → pedidos do evento visíveis com total consumido
```

---

## 3. O QUE PRECISA DE SER MUDADO/MODERNIZADO

### 3.1 Integração POS ↔ Eventos (CRÍTICO)

**A. Selector de Evento no POS**
- Quando uma mesa tem `event_id`, mostrar badge visual no POS
- Botão "Modo Evento" no POS para seleccionar evento activo
- Filtro de mesas: "Mostrar apenas mesas de evento"
- Indicador visual: mesas de evento com borda colorida diferente

**B. Checkout Vinculado ao Evento**
- Ao fazer checkout de mesa de evento, chamar `EventService.addOrderToEvent()`
- Se `order_type = EXTRA`, somar ao `extras_amount` do evento
- Se `order_type = INCLUIDO`, não somar (faz parte do pacote)
- Mostrar no recibo: "Evento: [Nome] • [Pacote/Extra]"

**C. Aplicar Pacote Automaticamente**
- Quando mesa de evento é aberta, carregar `included_items` do pacote
- Itens do pacote aparecem como "INCLUIDO" (sem custo adicional)
- Garçom pode adicionar extras (vendas normais) que somam ao evento

**D. Consumo Ilimitado**
- Se `consumption_mode = ILIMITADO`, itens do pacote podem ser pedidos sem limite
- Contador de consumo por tipo (ex: "Bebidas ilimitadas: 15 pedidos")
- Alerta se consumo excede estimativa

### 3.2 Modernização do Events.tsx

**E. Eventos Activos no POS**
- Widget no POS mostrando eventos do dia
- Click no evento → filtra mesas reservadas
- Estado do evento em tempo real (confirmado, em andamento)

**F. Relatório de Consumo por Evento**
- Total vendido (extras) vs pacote base
- Lista de pedidos com hora, mesa, itens, valor
- Comparação: estimado vs real
- Exportar PDF para o cliente

**G. Fechamento de Evento**
- Botão "Fechar Evento" que:
  - Verifica todas as mesas fechadas
  - Calcula total final (pacote + extras)
  - Gera factura final
  - Liberta mesas reservadas
  - Marca evento como CONCLUIDO

**H. Dashboard de Evento em Tempo Real**
- Mostrar consumo ao vivo durante o evento
- Gráfico de vendas por hora
- Top produtos consumidos
- Alertas de consumo excessivo

### 3.3 Melhorias de UI/UX

**I. Cards de Evento Mais Informativos**
- Mostrar progresso de consumo (barra: 60% do orçamento)
- Badge "AO VIVO" para eventos em andamento
- Cor dinâmica baseada no status

**J. Calendário Melhorado**
- Mostrar mesas reservadas no calendário
- Drag-and-drop para reagendar
- Cores por tipo de evento

---

## 4. ARQUITECTURA DE INTEGRAÇÃO PROPOSTA

### 4.1 Fluxo de Dados

```
Events.tsx (criar evento + reservar mesas + definir pacote)
    ↓
pos_tables.event_id = "evento-123"
    ↓
POS.tsx (abrir mesa)
    → detecta event_id na mesa
    → mostra badge "EVENTO"
    → carrega pacote (included_items)
    → itens do pacote = INCLUIDO (sem custo)
    → extras = venda normal
    ↓
Checkout (POS.tsx)
    → order.event_id = "evento-123"
    → order.is_event_order = true
    → order.event_order_type = "EXTRA" ou "INCLUIDO"
    → EventService.addOrderToEvent()
    → extras_amount actualizado no evento
    ↓
Events.tsx (detalhes do evento)
    → mostra pedidos em tempo real
    → total consumido = base + extras
    → relatório final ao concluir
```

### 4.2 Alterações no POS.tsx

```typescript
// 1. Detectar evento na mesa seleccionada
const tableEvent = useMemo(() => {
  if (!activeTable) return null;
  return events.find(e => e.id === activeTable.event_id);
}, [activeTable, events]);

// 2. Badge visual no header da mesa
{tableEvent && (
  <div className="bg-primary/20 border border-primary/40 rounded-lg px-3 py-1">
    <Sparkles size={12} className="inline text-primary" />
    <span className="text-xs text-primary font-bold ml-1">
      EVENTO: {tableEvent.name}
    </span>
  </div>
)}

// 3. No checkout, vincular ao evento
const handleCheckout = async () => {
  // ... checkout normal ...
  if (tableEvent) {
    await EventService.addOrderToEvent(tableEvent.id, orderId, 'EXTRA');
  }
};
```

### 4.3 Alterações no useStore

```typescript
// Adicionar eventos ao store
events: Event[];
loadEvents: () => Promise<void>;
// Para que o POS tenha acesso aos eventos sem fetch adicional
```

### 4.4 Novo Componente: EventConsumptionPanel

Um painel no POS que mostra:
- Evento activo seleccionado
- Itens do pacote (incluídos)
- Consumo actual (extras)
- Total acumulado
- Lista de pedidos do evento

---

## 5. CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1 — Conexão POS ↔ Eventos (3-4 dias)
- [ ] Carregar eventos no store (`useStore.events`)
- [ ] Detectar `event_id` nas mesas no POS
- [ ] Mostrar badge de evento na mesa
- [ ] No checkout, vincular pedido ao evento
- [ ] Actualizar `extras_amount` automaticamente

### Fase 2 — Pacotes no POS (2-3 dias)
- [ ] Carregar `included_items` do pacote ao abrir mesa de evento
- [ ] Itens incluídos marcados como "INCLUIDO" (sem custo)
- [ ] Extras vendidos normalmente
- [ ] Controlo de consumo ilimitado

### Fase 3 — Dashboard de Evento em Tempo Real (2 dias)
- [ ] Painel de consumo no POS
- [ ] Lista de pedidos do evento em tempo real
- [ ] Total consumido vs orçamento
- [ ] Top produtos consumidos

### Fase 4 — Fechamento e Relatórios (2-3 dias)
- [ ] Botão "Fechar Evento" no Events.tsx
- [ ] Verificação de mesas pendentes
- [ ] Relatório final de consumo (PDF)
- [ ] Factura final do evento
- [ ] Liberação automática de mesas

### Fase 5 — Modernização Visual (1-2 dias)
- [ ] Cards de evento com progresso de consumo
- [ ] Badge "AO VIVO" para eventos em andamento
- [ ] Calendário com mesas reservadas
- [ ] Notificações push para eventos próximos

### **Total estimado:** 10-14 dias úteis

---

## 6. BENEFÍCIOS ESPERADOS

| Métrica | Antes | Depois |
|---------|-------|--------|
| Vendas de evento no POS | Não vinculadas | Automáticas |
| Controlo de pacotes | Manual | Automático |
| Consumo em tempo real | Não existe | Dashboard ao vivo |
| Fechamento de evento | Manual | Automático com factura |
| Relatório de evento | Não existe | PDF completo |
| Mesas reservadas | Sem indicação no POS | Badge visual |
| Extras do evento | Não calculados | Soma automática |

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Mitigação |
|-------|-----------|
| Mesas de evento confundidas com mesas normais | Badge visual claro + cor diferente |
| Pacote aplicado incorrectamente | Confirmação ao abrir mesa de evento |
| Checkout sem vinculação | Verificação automática no checkout |
| Eventos sem mesas reservadas | Permitir modo "sem mesa" (evento sem mesa específica) |
| Performance com muitos eventos | Cache no store + lazy loading |

---

**Aprovação necessária para iniciar implementação.**
