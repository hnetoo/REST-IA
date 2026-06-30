# Relatorio Visual: Card FATURACAO ONTEM — OwnerDashboard

## 1. O que o user quer

O card **Faturacao Ontem** deve seguir a logica do **Dia Operacional**:
- **05:00 ate 04:59** do dia seguinte = 1 dia operacional
- O valor do card **so muda as 05:00** (quando comeca o novo dia operacional)
- Deve mostrar o **total do data_contabil** do dia operacional anterior

## 2. Como funciona atualmente (codigo existente)

### 2.1 Calculo do valor exibido no card

```typescript
// Card exibe: yesterdayRevenueFromChart (useMemo)
const yesterdayRevenueFromChart = useMemo(() => {
  const now = new Date();
  const UTC_OFFSET_LUANDA = 1 * 60 * 60 * 1000;
  const luandaTime = new Date(now.getTime() + UTC_OFFSET_LUANDA);
  const yesterday = new Date(luandaTime);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const total = supabaseOrders                    // <-- Array de ~1000 orders
    .filter(o => {
      const orderDateStr = (o.data_contabil || o.created_at || '').split('T')[0];
      return orderDateStr === yesterdayStr;         // <-- Match por string
    })
    .reduce((acc, o) => acc + Number(o.total_amount || o.total || 0), 0);

  return total;
}, [supabaseOrders]);                                // <-- Re-calcula sempre!
```

**Problema**: `supabaseOrders` e um array que busca **1000 orders mais recentes** do Supabase. Sempre que o array muda (nova venda, recarga), o `useMemo` recalcula. **O valor NAO trava as 05:00**.

### 2.2 Estado visual (cor do card)

```typescript
const isYesterdayOfficial = luandaTime.getHours() >= 5;
```

| Hora (Luanda) | Cor do Card | Badge |
|---------------|-------------|-------|
| 00:00 — 04:59 | Amarelo | EM ANDAMENTO |
| 05:00 — 23:59 | Laranja | OFICIAL |

**Problema**: A cor muda corretamente as 05:00, **mas o valor numerico continua a mudar** ao longo do dia toda vez que uma nova venda e registrada hoje (porque `supabaseOrders` e o array das ultimas 1000 orders, incluindo as de hoje, e o React re-renderiza).

### 2.3 Outra fonte de dados existente (NAO usada no card)

Existe tambem a funcao `fetchYesterdayRevenue` que:
- Busca do Supabase filtrando por `data_contabil = yesterdayStr`
- Guarda no `localStorage` com cache (`yesterdayRevenueV2_${today}`)
- **NAO e usada no card** — o card ignora este valor e usa `yesterdayRevenueFromChart`

```typescript
// Esta funcao existe mas NAO alimenta o card
const fetchYesterdayRevenue = useCallback(async () => {
  const cached = localStorage.getItem(`yesterdayRevenueV2_${today}`);
  if (cached) { setYesterdayRevenue(Number(cached)); return; }
  // ... busca do Supabase e guarda no cache
}, []);
```

## 3. Diagrama de fluxo atual

```
+------------+     +------------------+     +------------------+
|   Horario  |     |  supabaseOrders  |     |    Card Display   |
|  (Luanda)  |     |  (1000 orders)   |     |  (yesterdayRev   |
+------------+     +------------------+     |   FromChart)      |
      |                   |                 +------------------+
      |                   |                         |
      v                   v                         v
  04:59          Nova venda registrada          Valor muda!
    |                  hoje                        |
    |                   |                          |
    v                   v                          v
  05:00 -----> supabaseOrders atualizado ----> Valor muda DE NOVO
    |                   |                          |
    |                   | (React re-renderiza      |
    |                   |  por dependency change)    |
    v                   v                          v
  06:00          Mais uma venda hoje            Valor muda
    |                   |                          |
    |                   v                          |
    +-----------> Card atualiza automaticamente <---+
```

**Conclusao**: O valor do card e **volatil** — muda toda vez que o array `supabaseOrders` e atualizado (nova venda, sync, etc.). Nao e "travado" as 05:00.

## 4. Resumo do comportamento esperado vs atual

| Cenario | Esperado (user) | Atual (codigo) |
|---------|----------------|----------------|
| Valor do card de ontem | Trava as 05:00, nao muda mais | Muda toda vez que ha nova venda hoje |
| Fonte de dados | `data_contabil` do dia anterior | `supabaseOrders` filtrado (array volatil) |
| Cache | Sim, para travar o valor | Cache existe (`fetchYesterdayRevenue`) mas nao e usado |
| Badge "OFICIAL" | So deve aparecer apos 05:00 | Aparece corretamente, mas valor ainda muda |

## 5. Arquivos envolvidos

- `@/src/views/owner/OwnerDashboard.tsx:306-323` — `yesterdayRevenueFromChart` (useMemo)
- `@/src/views/owner/OwnerDashboard.tsx:698` — Card usa `yesterdayRevenueFromChart`
- `@/src/views/owner/OwnerDashboard.tsx:152-201` — `fetchYesterdayRevenue` (ignorado pelo card)
- `@/src/lib/dateUtils.ts:114-140` — `calculateDataContabil` (logica do dia operacional)

---

**Proximo passo sugerido**: Fazer o card usar `fetchYesterdayRevenue` (com cache e travamento as 05:00) em vez de `yesterdayRevenueFromChart` (volatil).
