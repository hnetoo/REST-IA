# Documento Técnico para Certificação de Software na AGT Angola

---

## Identificação do Software

| Campo | Valor |
|-------|-------|
| **Nome do Software** | REST IA |
| **Versão** | 1.1.1 |
| **Desenvolvedor** | Helder Neto |
| **Email** | hnetoo@gmail.com |
| **Telefone** | +244 923 068 301 |
| **Data do Documento** | 19 de Junho de 2025 |
| **Plataforma** | Desktop (Windows) + Web |
| **Tecnologia** | Electron + React + TypeScript |
| **Backend** | Supabase (PostgreSQL) |

---

## 1. Enquadramento Legal

O presente documento técnico descreve a conformidade do software **REST IA v1.1.1** com a legislação fiscal angolana, em particular com o **Decreto Presidencial nº 71/25 de 26 de Fevereiro de 2025**, que estabelece os requisitos para a certificação de software de faturação junto da **Administração Geral Tributária (AGT)** de Angola.

### Referenciais Legais Aplicáveis

- **Decreto Presidencial nº 71/25** — Regime de certificação de programas informáticos de faturação
- **Despacho Normativo AGT** — Procedimentos técnicos para certificação
- **Código do Imposto sobre o Valor Acrescentado (IVA)** — Lei nº 18/19 de 22 de Outubro
- **Código Comercial Angolano** — Regras de emissão de documentos comerciais

---

## 2. Descrição Funcional do Software

### 2.1 Sumário Executivo

O **REST IA** é um sistema de gestão integral para restaurantes desenvolvido por **Helder Neto**, que integra terminal de ponto de venda (POS), gestão de mesas, faturação fiscal, controlo de stock, gestão financeira e análise de dados com inteligência artificial.

### 2.2 Módulos Principais

| Módulo | Descrição | Conformidade Fiscal |
|--------|-----------|---------------------|
| **Terminal POS** | Ponto de venda com checkout fiscal | ✅ Emite documentos AGT |
| **Faturação AGT** | Emissão de documentos fiscais | ✅ Conforme DP 71/25 |
| **Gestão de Mesas** | Mapa de sala interativo | ✅ Integra com faturação |
| **Controlo de Stock** | Gestão de inventário | ✅ Rastreabilidade |
| **Financeiro** | Despesas, fluxo de caixa | ✅ Registos contabilísticos |
| **Dashboard** | Análise e relatórios | ✅ Dados fiscais |
| **Reservas** | Gestão de reservas | ✅ Integrado |
| **Gestão de Turnos** | Abertura e fecho de caixa | ✅ Auditoria |

### 2.3 Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICAÇÃO DESKTOP                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ELECTRON (Windows) — REST IA v1.1.1                 │   │
│  │  • Interface React + TypeScript                      │   │
│  │  • State Management: Zustand                         │   │
│  │  • Styling: TailwindCSS                              │   │
│  │  • Offline-first com SQLite local                    │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  CAMADA DE SERVIÇOS FISCAIS                           │  │
│  │  • documentService.ts — Geração de documentos         │  │
│  │  • agtService.ts — Submissão à AGT                    │  │
│  │  • agtSignatureService.ts — Assinatura e hash         │  │
│  │  • agtSeriesService.ts — Gestão de séries             │  │
│  │  • agtComplianceLogService.ts — Log de conformidade   │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  PERSISTÊNCIA                                         │  │
│  │  • SQLite (local, offline-first)                      │  │
│  │  • Supabase / PostgreSQL (cloud, sincronização)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Conformidade com Decreto Presidencial nº 71/25

### 3.1 Requisitos de Certificação

| Requisito DP 71/25 | Implementação no REST IA | Estado |
|---------------------|--------------------------|--------|
| Emissão de documentos fiscais | Suporte para FT, FR, TV, RG, NC, ND | ✅ Conforme |
| Numeração sequencial por série | `agtSeriesService.ts` gere séries | ✅ Conforme |
| Hash único por documento | `agtSignatureService.ts` gera hash SHA | ✅ Conforme |
| Cadeia de hash (hash anterior) | Cada documento referencia o hash anterior | ✅ Conforme |
| Registo de submissão à AGT | `agtComplianceLogService.ts` regista todas as operações | ✅ Conforme |
| Imutabilidade de documentos emitidos | Documentos não podem ser alterados após emissão | ✅ Conforme |
| Exportação SAF-T (OF) | Preparado para exportação | ✅ Conforme |
| Log de auditoria | Sistema de log completo com timestamp | ✅ Conforme |
| Identificação do software | REST IA v1.1.1 by Helder Neto | ✅ Conforme |

### 3.2 Tipos de Documentos Fiscais Suportados

Conforme definido em `src/types/agt.ts`:

| Código | Designação | Uso no Restaurante |
|--------|------------|---------------------|
| **FT** | Fatura | Pagamento diferido / B2B |
| **FR** | Fatura-Recibo | Pagamento imediato (padrão) |
| **TV** | Talão de Venda | B2C balcão, sem NIF |
| **RG** | Recibo | Pagamento de dívida faturada |
| **NC** | Nota de Crédito | Anulação / devolução |
| **ND** | Nota de Débito | Acréscimo a fatura emitida |

### 3.3 Códigos de Imposto (IVA)

| Código | Designação | Taxa |
|--------|------------|------|
| **NOR** | Taxa Normal | 14% |
| **RED** | Taxa Reduzida | 7% |
| **ISE** | Isento | 0% |
| **OUT** | Outro | Variável |

### 3.4 Estrutura do Documento Fiscal

Cada documento fiscal gerado pelo REST IA contém:

1. **Cabeçalho**
   - Tipo de documento (FT, FR, TV, etc.)
   - Número de série (ex: `FR-A-2025`)
   - Número sequencial do documento
   - Data de emissão
   - NIF do emitente
   - NIF do cliente (ou 999999999 para consumidor final)

2. **Linhas do Documento**
   - Número da linha
   - Código do produto
   - Descrição do produto
   - Quantidade
   - Preço unitário
   - Desconto (se aplicável)
   - Código de imposto (NOR, RED, ISE, OUT)
   - Percentagem de imposto
   - Montante de imposto
   - Montante líquido
   - Montante bruto

3. **Totais**
   - Total de imposto
   - Total líquido
   - Total bruto
   - Total de descontos

4. **Assinatura / Hash**
   - Hash único do documento (SHA-256)
   - Hash do documento anterior (cadeia)
   - Número de controlo do hash

5. **Metadados de Submissão**
   - UUID de submissão à AGT
   - Estado da submissão (PENDING, PROCESSING, ACCEPTED, REJECTED)
   - Código de resposta da AGT
   - Data e hora de submissão

---

## 4. Geração de Hash e Cadeia de Documentos

### 4.1 Algoritmo de Hash

O REST IA utiliza o serviço `agtSignatureService.ts` para gerar hashes conforme exigido pelo DP 71/25:

```
Hash = SHA-256(
  DataEmissao +
  TipoDocumento +
  NumeroDocumento +
  NIF Emitente +
  NIF Cliente +
  Total Documento +
  Linhas (código produto + quantidade + preço + taxa)
)
```

### 4.2 Cadeia de Hash

Cada documento fiscal referencia o hash do documento imediatamente anterior, formando uma cadeia inviolável:

```
Documento 1: Hash1 = SHA-256(Dados1)
Documento 2: Hash2 = SHA-256(Dados2 + Hash1)
Documento 3: Hash3 = SHA-256(Dados3 + Hash2)
...
```

Esta cadeia garante que qualquer alteração retroativa a um documento invalida todos os subsequentes, garantindo integridade fiscal.

### 4.3 Log de Conformidade

O `agtComplianceLogService.ts` regista todas as operações fiscais:

| Tipo de Log | Descrição |
|-------------|-----------|
| SERIES_REGISTRATION | Registo de nova série na AGT |
| INVOICE_VALIDATION | Validação de documento antes da emissão |
| SAFT_UPLOAD | Exportação/envio de SAF-T |
| DOCUMENT_EMISSION | Emissão de documento fiscal |
| SIGNATURE | Geração de hash/assinatura |

Cada entrada de log inclui:
- Timestamp ISO 8601
- Estado (SUCCESS, ERROR, WARNING)
- Dados do pedido (request)
- Dados da resposta (response)
- Mensagem de erro (se aplicável)

---

## 5. Gestão de Séries

### 5.1 Estrutura de Série

Cada série é autorizada pela AGT e contém:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `seriesCode` | Código da série | `FR-A-2025` |
| `seriesYear` | Ano da série | 2025 |
| `documentType` | Tipo de documento | FR |
| `establishmentNumber` | Nº do estabelecimento | 001 |
| `authorizedQuantity` | Quantidade autorizada | 1000 |
| `firstDocumentNo` | Primeiro número | 000001 |
| `lastDocumentNo` | Último número | 001000 |
| `currentSequence` | Sequência atual | 000042 |
| `status` | Estado (A=Activa, U=Em uso, F=Finalizada) | U |

### 5.2 Controlo de Sequência

- A sequência é incrementada automaticamente a cada documento emitido
- O sistema alerta quando atinge 80% da quantidade autorizada
- É impossível emitir documentos fora de ordem sequencial
- Séries finalizadas não podem ser reutilizadas

---

## 6. Submissão à AGT

### 6.1 Fluxo de Submissão

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Emissão    │────▶│  Submissão   │────▶│  Processamento │
│  do Doc     │     │  à AGT       │    │  pela AGT      │
│  (Local)    │     │  (Assíncrona)│     │                │
└─────────────┘     └──────────────┘     └───────────────┘
                           │                      │
                           ▼                      ▼
                    ┌──────────────┐     ┌───────────────┐
                    │  PENDING     │     │  ACCEPTED     │
                    │  (Fila local)│     │  REJECTED     │
                    └──────────────┘     │  CANCELLED    │
                                         └───────────────┘
```

### 6.2 Estados de Submissão

| Estado | Descrição |
|--------|-----------|
| PENDING | Documento emitido localmente, aguarda submissão |
| PROCESSING | Submissão em curso pela AGT |
| ACCEPTED | Documento aceito pela AGT |
| REJECTED | Documento recusado pela AGT |
| CANCELLED | Submissão cancelada |

### 6.3 Resiliência Offline

O REST IA funciona em modo **offline-first**:
- Documentos são emitidos localmente mesmo sem internet
- Submissões pendentes são colocadas em fila
- Quando a ligação é restabelecida, as submissões são enviadas automaticamente
- Retry automático com backoff exponencial

---

## 7. Segurança e Integridade

### 7.1 Autenticação de Utilizadores

- Login por PIN (offline, não depende de serviços externos)
- Controlo de acesso por roles: OWNER, ADMIN, CAIXA, GARCOM, COZINHA
- Permissões granulares por módulo

### 7.2 Proteção de Dados

- **Row Level Security (RLS)** ativo no Supabase
- Variáveis de ambiente isoladas (`.env.local`)
- Tokens de autenticação geridos pelo Supabase Auth
- Dados sensíveis não são armazenados em texto simples

### 7.3 Integridade Fiscal

- Documentos emitidos **não podem ser alterados** após emissão
- Hash em cadeia impede adulteração retroativa
- Log de conformidade regista todas as operações
- Backups automáticos de sessão

### 7.4 Assinatura do Código

O instalador Windows (`TascaVereda-Setup-1.1.1.exe`) é assinado com `signtool.exe`, garantindo:
- Identidade do publicador
- Integridade do instalador
- Não-repúdio

---

## 8. Persistência de Dados

### 8.1 Armazenamento Local (SQLite)

O REST IA utiliza SQLite local para funcionamento offline:

| Tabela | Conteúdo |
|--------|----------|
| `orders` | Pedidos e vendas |
| `expenses` | Despesas |
| `cash_flow` | Fluxo de caixa |
| `staff` | Pessoal |
| `agt_documents` | Documentos fiscais |
| `agt_series` | Séries de faturação |
| `agt_submissions` | Submissões à AGT |
| `agt_compliance_logs` | Logs de conformidade |

### 8.2 Sincronização Cloud (Supabase)

- Sincronização automática quando online
- Backup em tempo real no PostgreSQL (Supabase)
- Resolução de conflitos automática
- Histórico completo de alterações

---

## 9. Relatórios e Exportação

### 9.1 Relatórios Disponíveis

| Relatório | Descrição |
|-----------|-----------|
| Fecho de Turno | Resumo de vendas por turno |
| Fecho do Dia | Resumo diário completo |
| Vendas por Produto | Análise de produtos vendidos |
| Documentos Fiscais | Listagem de documentos AGT emitidos |
| Fluxo de Caixa | Entradas e saídas |
| Relatórios Fiscais | Documentos por tipo, série, período |

### 9.2 Exportação SAF-T (OF)

O sistema está preparado para exportação no formato SAF-T (Standard Audit File for Tax Purposes), conforme exigido pela AGT para auditorias fiscais.

---

## 10. Impressão de Documentos

### 10.1 Suporte de Impressão

- Impressão em impressoras térmicas (58mm/80mm)
- Impressão em A4
- Pré-visualização antes da impressão
- Reimpressão a partir do histórico

### 10.2 Conteúdo do Documento Impresso

Cada documento fiscal impresso contém:
- Cabeçalho com identificação do estabelecimento (NIF, nome, morada)
- Número do documento e série
- Data e hora de emissão
- Linhas com produtos, quantidades, preços
- Totais (líquido, IVA, bruto)
- Hash do documento
- NIF do cliente (se aplicável)
- Método de pagamento
- Rodapé com identificação do software: **REST IA v1.1.1 by Helder Neto**

---

## 11. Identificação do Software nos Documentos

Todos os documentos fiscais emitidos pelo REST IA incluem a identificação do software no rodapé:

```
Processado por programa certificado AGT nº [Nº de Certificação]
REST IA v1.1.1 by Helder Neto
```

A configuração fiscal (`AGTFiscalConfig`) inclui o campo `softwareCertificateNumber` que deve ser preenchido com o número de certificação atribuído pela AGT após aprovação.

---

## 12. Requisitos Técnicos para Certificação

### 12.1 Ambiente de Testes

| Item | Especificação |
|------|---------------|
| Sistema Operativo | Windows 10/11 (64-bit) |
| Memória RAM | Mínimo 4 GB |
| Espaço em Disco | 500 MB |
| Ligação à Internet | Necessária para submissão à AGT |
| Impressora | Térmica 80mm ou A4 |

### 12.2 Dependências

| Dependência | Versão | Função |
|-------------|--------|--------|
| Electron | 41.2.0 | Runtime desktop |
| React | 18.3.1 | Framework UI |
| TypeScript | 5.x | Linguagem |
| Supabase JS | 2.x | Cliente PostgreSQL |
| better-sqlite3 | 11.x | Base de dados local |
| Zustand | 5.x | Gestão de estado |

### 12.3 Ficheiros de Configuração

| Ficheiro | Conteúdo |
|----------|----------|
| `.env.local` | URL e chave do Supabase |
| `electron-builder.json` | Configuração do instalador |
| `package.json` | Versão e dependências |
| `src/types/agt.ts` | Tipos de documentos fiscais |
| `src/lib/agt/` | Serviços AGT |

---

## 13. Estrutura de Ficheiros Fiscais

```
src/
├── types/
│   └── agt.ts                          # Tipos de documentos AGT
├── lib/
│   └── agt/
│       ├── agtService.ts               # Serviço principal AGT
│       ├── agtRealService.ts           # Submissão real à AGT
│       ├── agtSeriesService.ts         # Gestão de séries
│       ├── agtSignatureService.ts      # Hash e assinatura
│       ├── agtComplianceLogService.ts  # Log de conformidade
│       └── agtTestService.ts           # Testes de conformidade
├── hooks/
│   └── useAGT.ts                       # Hook React para AGT
├── views/
│   ├── AGTConfig.tsx                   # Configuração fiscal
│   ├── AGTControl.tsx                  # Painel de controlo AGT
│   └── Finance/
│       └── AGTDocumentsTab.tsx         # Listagem de documentos
└── components/
    └── [Vários componentes de UI fiscal]
```

---

## 14. Faturação Eletrónica

### 14.1 Preparação para Faturação Eletrónica

O **REST IA v1.1.1** está plenamente preparado para a **faturação eletrónica** conforme as directrizes da AGT e o Decreto Presidencial nº 71/25. O software implementa todos os requisitos técnicos necessários para a emissão, transmissão e armazenamento de documentos fiscais electrónicos.

### 14.2 Arquitectura de Faturação Eletrónica

```
┌──────────────────────────────────────────────────────────────┐
│  EMISSÃO ELECTRÓNICA                                          │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐  │
│  │  POS Checkout│───▶│  Documento    │───▶│  Hash +      │  │
│  │  (Venda)     │    │  Service      │    │  Assinatura  │  │
│  └──────────────┘    └───────────────┘    └──────┬───────┘  │
│                                                   │          │
│  ┌──────────────────────────────────────────────▼───────┐  │
│  │  PERSISTÊNCIA FISCAL                                  │  │
│  │  • Supabase: agt_documents (documento completo)      │  │
│  │  • Supabase: agt_submissions (estado da submissão)   │  │
│  │  • Local: SQLite (backup offline)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SUBMISSÃO ELECTRÓNICA À AGT                          │  │
│  │  • agtRealService.ts — comunicação com API AGT       │  │
│  │  • Submissão assíncrona com fila de retry            │  │
│  │  • Registo de UUID e estado de cada submissão        │  │
│  │  • Log de conformidade auditável                     │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 14.3 Componentes Técnicos de Faturação Eletrónica

| Componente | Ficheiro | Função |
|------------|----------|--------|
| `documentService.ts` | `src/lib/agt/documentService.ts` | Geração de documentos fiscais a partir de pedidos |
| `agtRealService.ts` | `src/lib/agt/agtRealService.ts` | Submissão electrónica à API da AGT |
| `agtSignatureService.ts` | `src/lib/agt/agtSignatureService.ts` | Geração de hash SHA-256 e cadeia de documentos |
| `agtSeriesService.ts` | `src/lib/agt/agtSeriesService.ts` | Gestão de séries autorizadas pela AGT |
| `agtComplianceLogService.ts` | `src/lib/agt/agtComplianceLogService.ts` | Log auditável de todas as operações fiscais |
| `useAGT.ts` | `src/hooks/useAGT.ts` | Hook React para integração fiscal no POS |
| `AGTControl.tsx` | `src/views/AGTControl.tsx` | Painel de gestão de faturação electrónica |
| `AGTConfig.tsx` | `src/views/AGTConfig.tsx` | Configuração fiscal do estabelecimento |

### 14.4 Funcionalidades de Faturação Eletrónica Implementadas

- ✅ **Emissão de documentos electrónicos** (FT, FR, TV, RG, NC, ND)
- ✅ **Hash único por documento** com cadeia inviolável (SHA-256)
- ✅ **Submissão electrónica à AGT** via API (agtRealService)
- ✅ **Gestão de séries** autorizadas pela AGT
- ✅ **Log de conformidade** auditável com timestamp
- ✅ **Armazenamento electrónico** em Supabase (PostgreSQL) com backup local SQLite
- ✅ **Funcionamento offline** com fila de submissões pendentes
- ✅ **Retry automático** de submissões falhadas
- ✅ **Identificação do software** em todos os documentos emitidos
- ✅ **Impressão de documentos** fiscais (térmica 80mm e A4)
- ✅ **Pré-visualização** antes da emissão
- ✅ **Reimpressão** a partir do histórico de documentos

### 14.5 Conformidade com Faturação Eletrónica

| Requisito | Estado | Implementação |
|-----------|--------|---------------|
| Emissão de documentos em formato electrónico | ✅ | `documentService.ts` |
| Assinatura electrónica (hash) | ✅ | `agtSignatureService.ts` |
| Submissão à AGT por via electrónica | ✅ | `agtRealService.ts` |
| Armazenamento electrónico seguro | ✅ | Supabase + SQLite |
| Cadeia de hash entre documentos | ✅ | `agtSignatureService.ts` |
| Log auditável de operações | ✅ | `agtComplianceLogService.ts` |
| Numeração sequencial por série | ✅ | `agtSeriesService.ts` |
| Imutabilidade de documentos emitidos | ✅ | Bloqueio no `documentService.ts` |
| Identificação do software nos documentos | ✅ | Rodapé com "REST IA v1.1.1 by Helder Neto" |
| Funcionamento offline com sync posterior | ✅ | `pendingSyncOrders.ts` + `offlineSync.ts` |

---

## 15. Declaração de Conformidade

Eu, **Helder Neto**, na qualidade de desenvolvedor do software **REST IA v1.1.1**, declaro que:

1. O software cumpre com os requisitos técnicos estabelecidos no **Decreto Presidencial nº 71/25** de 26 de Fevereiro de 2025.

2. Todos os documentos fiscais emitidos (FT, FR, TV, RG, NC, ND) seguem a estrutura e formato exigidos pela AGT.

3. O sistema de hash em cadeia garante a integridade e inviolabilidade dos documentos fiscais.

4. O log de conformidade regista todas as operações fiscais de forma auditável.

5. O software não permite a alteração de documentos fiscais após a sua emissão.

6. O sistema funciona em modo offline, garantindo continuidade de operação sem dependência de ligação à internet.

7. As submissões à AGT são realizadas de forma assíncrona, com retry automático e registo de estado.

8. A identificação do software ("REST IA v1.1.1 by Helder Neto") está presente em todos os documentos emitidos.

9. O software está preparado para **faturação eletrónica**, com emissão, submissão e armazenamento electrónico de documentos fiscais conforme exigido pela AGT.

10. A submissão electrónica de documentos à AGT é realizada via API, com registo de UUID, estado de processamento e log auditável de todas as operações.

---

## 16. Informações de Contacto

| Campo | Valor |
|-------|-------|
| **Software** | REST IA |
| **Versão** | 1.1.1 |
| **Desenvolvedor** | Helder Neto |
| **Email** | hnetoo@gmail.com |
| **Telefone** | +244 923 068 301 |
| **Plataforma** | Desktop (Windows) + Web |
| **Licença** | Privativa |
| **Data** | 19 de Junho de 2025 |

---

*Documento gerado para fins de certificação de software junto da AGT — Administração Geral Tributária de Angola.*

*REST IA v1.1.1 — © 2025 Helder Neto. Todos os direitos reservados.*
