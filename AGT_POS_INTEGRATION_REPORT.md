# Relatório: Integração de Documentos AGT no POS

## Visão Geral Executiva

**Sim, é 100% viável e faz total sentido.**  
O POS atual fecha vendas mas **não emite documento fiscal AGT** no momento do checkout. A integração torna o processo conforme a legislação angolana (DP 71/25) e automatiza a emissão fiscal no ponto de venda.

---

## 1. Tipos de Documentos & Quando Usar

| Tipo | Nome | Quando Usar | Restauração? |
|------|------|-------------|--------------|
| **FR** | Fatura-Recibo | Pagamento imediato (mais comum) | ✅ **Padrão** |
| **FT** | Fatura | Pagamento diferido / Cliente com NIF que quer fatura | ✅ Frequente |
| **FS** | Fatura Simplificada | Consumidor final sem NIF, valores baixos | ✅ Muito comum |
| **RG** | Recibo | Pagamento de dívida já faturada | ✅ Eventual |
| **NC** | Nota de Crédito | Anulação / devolução | ✅ Raro mas necessário |
| **ND** | Nota de Débito | Acréscimo a fatura já emitida | ⚠️ Pouco comum |

> **Nota crítica:** O tipo `FS` (Fatura Simplificada) **não existe no código atual** (`src/types/agt.ts`). Precisa ser adicionado — é um tipo oficial do Decreto 71/25 e o mais usado em B2C/restauração rápida.

---

## 2. Fluxo Proposto no POS

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE SOLICITA CONTA                                         │
│  (ou operador inicia checkout)                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 1: TIPO DE DOCUMENTO (Modal/Drawer)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  Fatura-   │  │  Fatura    │  │  Fatura    │               │
│  │  Recibo    │  │            │  │Simplificada│               │
│  │   (FR)     │  │   (FT)     │  │   (FS)     │               │
│  │  Padrão    │  │ Pagamento  │  │ Consumidor │               │
│  │            │  │ Diferido   │  │  Final     │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 2: DADOS DO CLIENTE                                     │
│  • NIF? (obrigatório para FT, opcional para FR/FS)           │
│  • Nome / Morada (para FT com NIF)                            │
│  • Toggle: "Consumidor Final" (auto-preenche 999999999)       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 3: PAGAMENTO                                            │
│  • Multicaixa / Numerário / Transferência / Cartão             │
│  • Valor recebido + Troco (auto-calculado)                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 4: EMISSÃO FISCAL AGT                                   │
│  • Gera hash conforme DP 71/25                                 │
│  • Atribui número de série sequencial                          │
│  • Persiste no Supabase (agt_documents)                        │
│  • Atualiza order com: invoice_number, document_type, hash     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 5: IMPRESSÃO + DISPLAY CLIENTE                          │
│  • Imprime documento fiscal (thermal / A4)                    │
│  • Envia para Display do Cliente (se ativo)                   │
│  • Feedback: "Documento FR 2025/000042 emitido com sucesso"  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Alterações Técnicas Necessárias

### 3.1 Adicionar tipo `FS` (Falta crítica)

`src/types/agt.ts`:
```typescript
export type AGTDocumentType =
  | 'FT'  // Fatura
  | 'FR'  // Fatura-Recibo
  | 'FS'  // Fatura Simplificada  ← ADICIONAR
  | 'ND'  // Nota de Débito
  | 'NC'  // Nota de Crédito
  | 'GT'  // Guia de Transporte
  | 'GR'  // Guia de Remessa
  | 'RG'; // Recibo
```

### 3.2 Modificar checkout do POS

`src/views/POS.tsx` — Substituir o checkout simples por **checkout fiscal**:

```typescript
// HOOK/MODAL novo: useDocumentTypeSelector
const [selectedDocumentType, setSelectedDocumentType] = useState<AGTDocumentType>('FR');

// No handleConfirmPayment (substituir linha 708):
// DEPOIS:
const agtResult = await emitDocumentFromOrder(
  currentOrder,
  activeSeries,        // série da AGT para o tipo escolhido
  fiscalConfig,        // NIF, nome empresa, etc.
  selectedDocumentType // FR / FT / FS / RG
);

if (agtResult.success) {
  const document = agtResult.document;
  
  // Guardar no order
  await updateOrderWithAGTDocument(currentOrder.id, {
    invoice_number: document.documentNumber,
    document_type: document.documentType,
    agt_hash: document.hash,
    agt_series: document.seriesCode
  });
  
  // Depois fazer checkout normal
  await checkoutTable(currentOrder.id, method, customerId, customerNif);
}
```

### 3.3 Novo componente: `DocumentTypeSelector`

```tsx
// src/components/DocumentTypeSelector.tsx
interface Props {
  value: AGTDocumentType;
  onChange: (type: AGTDocumentType) => void;
  orderTotal: number;
  customerNif?: string;
}

// Regras de negócio:
// • FR: padrão se pagamento imediato
// • FT: se cliente pediu fatura (tem NIF) ou pagamento diferido
// • FS: se consumidor final sem NIF e valor < limite legal
// • RG: se é pagamento de fatura anterior já emitida
```

### 3.4 Novo hook: `usePOSFiscalEmission`

```typescript
// src/hooks/usePOSFiscalEmission.ts
export function usePOSFiscalEmission() {
  const { settings, currentUser } = useStore();
  
  const emit = async (
    order: Order,
    docType: AGTDocumentType,
    paymentMethod: PaymentMethod
  ): Promise<AGTEmissionResult> => {
    
    const series = await getSeriesForType(docType, settings.nif);
    
    const result = await emitDocumentFromOrder(order, series, {
      taxRegistrationNumber: settings.nif,
      taxRate: settings.tax_rate ?? 0.14,
      eacCode: settings.eac_code
    }, docType);
    
    if (result.success) {
      // Submeter à AGT (async, não bloqueia POS)
      submitToAGTAsync(result.document);
    }
    
    return result;
  };
  
  return { emit };
}
```

### 3.5 Alterações no `documentService.ts`

```typescript
// emitDocumentFromOrder já existe, mas precisa aceitar 'FS'
// Verificar se series.currentSequence < series.authorizedQuantity
// Verificar se hash anterior é válido (cadeia de hash)
```

### 3.6 Série por tipo de documento

Cada tipo (FR, FT, FS) precisa da **sua própria série** na AGT:

| Tipo | Série | Exemplo |
|------|-------|---------|
| FR | `FR-A-2025` | FR A/000042 |
| FT | `FT-A-2025` | FT A/000018 |
| FS | `FS-A-2025` | FS A/000156 |

> No AGTControl.tsx/SystemHub já existe gestão de séries — precisa filtrar por tipo.

---

## 4. UI/UX Proposta — Mockups

### 4.1 Stepper no Checkout

```
┌─────────────────────────────────────┐
│  1. Documento  →  2. Pagamento  →  3. Emitir   │
└─────────────────────────────────────┘
```

### 4.2 Seletor de Tipo (Radio Cards)

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│   📄 FR    │  │   📄 FT    │  │   📄 FS    │
│ Fatura-    │  │ Fatura     │  │ Simplifi-  │
│ Recibo     │  │            │  │ cada       │
│            │  │            │  │            │
│ ✅ Padrão  │  │ Pagamento  │  │ Sem NIF    │
│   Immediato│  │ Diferido   │  │ Balcão     │
└────────────┘  └────────────┘  └────────────┘
```

### 4.3 Campo NIF condicional

```
Se FR/FS:  [✅ Consumidor Final]  (auto: 999999999)
Se FT:     [___________] NIF do Cliente (obrigatório)
           [___________] Nome
           [___________] Morada
```

### 4.4 Feedback pós-emissão

```
┌─────────────────────────────────────┐
│  ✅ Documento Emitido               │
│                                     │
│  FR 2025A/000042                    │
│  Hash: 3a9f...e2b1                │
│  Total: 3.500 Kz                   │
│                                     │
│  [🖨️ Imprimir]  [👁️ Display]     │
└─────────────────────────────────────┘
```

---

## 5. Arquitetura — Onde Encaixar

```
┌──────────────────────────────────────────────────────────────┐
│                         VIEWS                                  │
│  ┌──────────────┐      ┌──────────────────┐                   │
│  │   POS.tsx    │─────▶│ DocumentTypeModal│                   │
│  │  (checkout)  │      │ (seleciona FT/FR)│                   │
│  └──────┬───────┘      └──────────────────┘                   │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           HOOK: usePOSFiscalEmission                    │ │
│  │  • Valida dados do cliente                             │ │
│  │  • Busca série ativa para o tipo                       │ │
│  │  • Chama emitDocumentFromOrder()                       │ │
│  │  • Persiste no Supabase                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           SERVICES                                      │ │
│  │  ┌─────────────┐    ┌─────────────┐   ┌─────────────┐  │ │
│  │  │ document-   │    │   agt-      │   │   hash-     │  │ │
│  │  │ Service.ts  │───▶│  Service.ts │──▶│ Service.ts  │  │ │
│  │  │(gera doc)   │    │(submete AGT)│   │(gera hash) │  │ │
│  │  └─────────────┘    └─────────────┘   └─────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           STORE / DATABASE                              │ │
│  │  • orders (invoice_number, document_type, agt_hash)    │ │
│  │  • agt_documents (documento fiscal completo)           │ │
│  │  • agt_series (controle de séries)                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Riscos & Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Série esgotada | 🔴 Alto | Alerta prévio quando atinge 80% da série |
| AGT offline | 🔴 Alto | Queue local + retry automático |
| Cliente sem NIF | 🟡 Médio | Default para 999999999 + FS |
| Duplo clique em emitir | 🔴 Alto | State lock (igual ao tableStateLock) |
| Hash inválido | 🔴 Alto | Validar antes de persistir |
| Impressora falha | 🟡 Médio | Permitir re-impressão do histórico |

---

## 7. Fases de Implementação Sugeridas

| Fase | Escopo | Tempo Est. | Risco |
|------|--------|------------|-------|
| **F1** | Adicionar tipo `FS` + validar tipos | 30 min | 🟢 Zero |
| **F2** | Criar `DocumentTypeSelector` UI | 2-3h | 🟢 Baixo |
| **F3** | Integrar emissão no checkout POS | 3-4h | 🟡 Médio |
| **F4** | Hash + série + persistência Supabase | 2h | 🟡 Médio |
| **F5** | Testes fim-a-fim + impressão | 2h | 🟡 Médio |
| **F6** | NC (Nota de Crédito) / anulações | 3-4h | 🔴 Alto |

**Total estimado:** 2 dias de trabalho focado.

---

## 8. Conclusão

**Recomendação: IMPLEMENTAR.**

A integração é:
- ✅ **Viável** — código AGT já existe, só falta ligar ao checkout
- ✅ **Obrigatória** — DP 71/25 exige documento fiscal por transação
- ✅ **Estratégica** — diferenciador competitivo (muitos POS angolanos não fazem isso)
- ✅ **Segura** — pode ser feita em fases, sem quebrar o POS atual

**Próximo passo:** Aprovar F1 + F2 para começar.
