# Documentação Técnica Detalhada — REST IA v1.1.1

**Software:** REST IA  
**Versão:** 1.1.1  
**Desenvolvedor:** Helder Neto  
**Email:** hnetoo@gmail.com  
**Telefone:** +244 923 068 301  
**Data:** 19 de Junho de 2025  

---

## Índice

1. [Visão Geral do Software](#1-visão-geral-do-software)
2. [Arquitectura do Sistema](#2-arquitectura-do-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Modelo de Dados — Supabase-First](#4-modelo-de-dados--supabase-first)
5. [Gestão de Estado (Zustand)](#5-gestão-de-estado-zustand)
6. [Motor de Sincronização (SyncCore)](#6-motor-de-sincronização-synccore)
7. [Terminal POS](#7-terminal-pos)
8. [Faturação Eletrónica e AGT](#8-faturação-electrónica-e-agt)
9. [Sistema de Permissões e Roles](#9-sistema-de-permissões-e-roles)
10. [Persistência Offline](#10-persistência-offline)
11. [Impressão Térmica](#11-impressão-térmica)
12. [Rotas e Navegação](#12-rotas-e-navegação)
13. [Estrutura de Ficheiros](#13-estrutura-de-ficheiros)
14. [Segurança](#14-segurança)
15. [Build e Deployment](#15-build-e-deployment)
16. [Requisitos do Sistema](#16-requisitos-do-sistema)
17. [Informações de Contacto](#17-informações-de-contacto)

---

## 1. Visão Geral do Software

O **REST IA** é um sistema de gestão integral para restaurantes desenvolvido por **Helder Neto**, que combina terminal de ponto de venda (POS), faturação eletrónica conforme legislação angolana (DP 71/25), gestão de mesas, controlo de stock, gestão financeira e análise de dados com inteligência artificial.

### 1.1 Funcionalidades Principais

| Módulo | Descrição |
|--------|-----------|
| **Terminal POS** | Ponto de venda com checkout, gestão de mesas e carrinho |
| **Faturação Eletrónica AGT** | Emissão de documentos fiscais conforme DP 71/25 |
| **Dashboard** | Painel analytics com métricas em tempo real |
| **Gestão de Mesas** | Mapa de sala interativo com zonas e formas |
| **Controlo de Stock** | Gestão de inventário com alertas de stock mínimo |
| **Financeiro** | Despesas, fluxo de caixa, relatórios financeiros |
| **Centro de Lucro** | Análise de margens e rentabilidade |
| **Compras** | Gestão de compras com aprovação |
| **Análises** | Relatórios e gráficos com IA |
| **Reservas** | Gestão de reservas de mesas |
| **Eventos** | Gestão de eventos |
| **Gestão de Equipa** | Funcionários, salários, turnos, presenças |
| **Menu Digital** | Menu público acessível por QR code |
| **Manual** | Manual do utilizador integrado |
| **Configurações** | Hub do sistema com todas as definições |

### 1.2 Plataformas Suportadas

- **Desktop:** Windows 10/11 (64-bit) via Electron
- **Web:** Qualquer navegador moderno (deploy no Vercel)
- **PWA:** Progressive Web App com Service Worker

---

## 2. Arquitectura do Sistema

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     APLICAÇÃO REST IA v1.1.1                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CAMADA DE APRESENTAÇÃO (React + TypeScript)              │   │
│  │  • Views (POS, Dashboard, Finance, Inventory, etc.)      │   │
│  │  • Components (Sidebar, Modals, Cards, etc.)             │   │
│  │  • Styling: TailwindCSS + Petroleum Green theme          │   │
│  │  • Icons: Lucide React                                    │   │
│  │  • Routing: React Router DOM v6                           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  CAMADA DE ESTADO (Zustand)                               │   │
│  │  • useStore.ts — Store principal (5500+ linhas)          │   │
│  │  • useUserStore.ts — Autenticação e utilizadores         │   │
│  │  • useAuthStore.ts — Sessões de autenticação             │   │
│  │  • Persistência selectiva no localStorage                │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  CAMADA DE SERVIÇOS                                      │   │
│  │  • useSyncCore — Motor de cálculo financeiro             │   │
│  │  • documentService — Geração de documentos fiscais       │   │
│  │  • agtRealService — Submissão electrónica à AGT          │   │
│  │  • agtSignatureService — Hash e cadeia de documentos     │   │
│  │  • agtSeriesService — Gestão de séries fiscais           │   │
│  │  • agtComplianceLogService — Log auditável               │   │
│  │  • sqliteService — Base de dados local (sql.js/WASM)     │   │
│  │  • supabaseDataLoader — Carregamento de dados            │   │
│  │  • offlineSync — Fila de sincronização offline           │   │
│  │  • pendingSyncOrders — Pedidos pendentes de sync         │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  CAMADA DE DADOS (Supabase-First)                         │   │
│  │  • Supabase (PostgreSQL) — Fonte primária de dados       │   │
│  │  • SQLite (sql.js/WASM) — Backup local offline            │   │
│  │  • localStorage — Persistência de sessão e configurações │   │
│  │  • IndexedDB — Backup de ordens ativas                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Padrão Arquitectural — Supabase-First

O REST IA segue um padrão **Supabase-First com fallback offline**:

1. **Na inicialização:** Carrega todos os dados do Supabase (`supabaseDataLoader.ts`) — produtos, categorias, mesas, clientes e ordens ativas
2. **Durante operação:** Sincroniza vendas em tempo real com o Supabase via `syncOrderToSupabase()` e `syncActiveOrderToSupabase()`
3. **Offline:** Guarda operações em fila local (`pendingSyncOrders.ts`) para sincronização posterior
4. **Persistência de sessão:** Zustand persiste apenas dados pequenos (settings, currentUser, activeOrders, customers) no localStorage via `customPersistenceStorage`

### 2.3 Fluxo de Dados

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Venda   │────▶│  useStore    │────▶│  Supabase   │────▶│ PostgreSQL│
│  (POS)   │     │  (Zustand)   │     │  Client     │     │  (Cloud)  │
└──────────┘     └──────┬───────┘     └─────────────┘     └──────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  localStorage│  (sessão + backup)
                 │  + SQLite    │  (offline)
                 └──────────────┘
```

---

## 3. Stack Tecnológico

### 3.1 Dependências Principais

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **Electron** | 41.2.0 | Runtime desktop para Windows |
| **React** | 18.3.1 | Framework de interface de utilizador |
| **TypeScript** | 5.x | Linguagem de programação tipada |
| **Vite** | 6.x | Build tool e dev server |
| **Zustand** | 5.x | Gestão de estado global |
| **React Router DOM** | 6.x | Routing client-side |
| **TailwindCSS** | 3.x | Framework CSS utility-first |
| **Lucide React** | 0.x | Biblioteca de ícones |
| **Supabase JS** | 2.x | Cliente PostgreSQL e Auth |
| **sql.js** | 1.x | SQLite em WebAssembly (offline) |
| **jsPDF** | 2.x | Geração de PDFs |
| **html2canvas** | 1.4.1 | Captura de HTML para imagem |
| **date-fns** | 3.x | Manipulação de datas |
| **recharts** | 2.x | Gráficos e visualizações |
| **i18next** | 23.x | Internacionalização |

### 3.2 DevDependencies

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **electron-builder** | 25.x | Empacotamento do instalador Windows |
| **concurrently** | 9.x | Execução paralela de processos |
| **vitest** | 2.x | Framework de testes |
| **rimraf** | 5.x | Limpeza de ficheiros |
| **wait-on** | 8.x | Aguardar serviços |

---

## 4. Modelo de Dados — Supabase-First

### 4.1 Cliente Supabase

O cliente Supabase é configurado em `src/supabase_standalone.ts` como instância única:

```typescript
export const supabase = createClient(
  'https://tboiuiwlqfzcvakxrsmj.supabase.co',
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'sb-tboiuiwlqfzcvakxrsmj-auth-token',
      storage: window.localStorage
    },
    global: {
      headers: { 'x-client-info': 'rest-ia-windows-app' }
    },
    db: { schema: 'public' }
  }
);
```

### 4.2 Tabelas Principais do Supabase

| Tabela | Função | Colunas Principais |
|--------|--------|---------------------|
| `products` | Produtos do menu | id, name, price, cost_price, category_id, image_url, is_active, stock_quantity, unit, sku, min_stock |
| `categories` | Categorias do menu | id, name, icon, is_visible_digital |
| `pos_tables` | Mesas do restaurante | id, name, seats, status, x, y, zone, shape, rotation |
| `orders` | Pedidos / Vendas | id, customer_name, total_amount, status, payment_method, invoice_number, table_id, created_at, data_contabil |
| `order_items` | Itens dos pedidos | id, order_id, product_id, quantity, unit_price, total_price |
| `expenses` | Despesas | id, description, amount_kz, category, status, created_at |
| `cash_flow` | Fluxo de caixa | id, amount, category, type, description, created_at |
| `staff` | Funcionários | id, full_name, role, base_salary_kz, phone, status, subsidios, bonus, horas_extras, descontos, salario_base |
| `customers` | Clientes | id, name, phone, points, balance, visits, last_visit |
| `agt_documents` | Documentos fiscais AGT | id, documentType, seriesCode, documentNumber, hash, lines, totals |
| `agt_series` | Séries de faturação | id, seriesCode, documentType, authorizedQuantity, currentSequence, status |
| `agt_submissions` | Submissões à AGT | id, submissionUuid, documentNo, status, resultCode |
| `agt_compliance_logs` | Log de conformidade | id, logType, status, requestData, responseData, timestamp |
| `external_history` | Histórico externo | id, amount, description, date |

### 4.3 Carregamento de Dados

O carregamento inicial é feito por `src/lib/supabaseDataLoader.ts`:

```typescript
export async function loadAllFromSupabase(store) {
  const [menu, categories, tables, customers] = await Promise.all([
    loadProductsFromSupabase(),    // SELECT * FROM products
    loadCategoriesFromSupabase(),  // SELECT * FROM categories
    loadTablesFromSupabase(),      // SELECT * FROM pos_tables
    loadCustomersFromSupabase()    // SELECT * FROM customers
  ]);
  store.setMenu(menu);
  store.setCategories(categories);
  store.setTables(tables);
  store.setCustomers(customers);
  // Carregar ordens ativas para actualizar status das mesas
  await loadAndMergeActiveOrders();
}
```

### 4.4 Sincronização de Vendas

Quando uma venda é finalizada no POS, `syncOrderToSupabase()` é chamada:

- **App Web online:** Sincroniza imediatamente via RPC `sync_complete_order` (atómico — order + order_items)
- **App Electron online:** Agenda sincronização com delay de 500ms
- **Offline:** Guarda apenas localmente, adiciona à fila `pending_sync_orders`

### 4.5 Dia Operacional (data_contabil)

O sistema usa `calculateDataContabil()` de `src/lib/dateUtils.ts` para calcular o dia operacional. Isto garante que vendas após meia-noite contabilizam no dia operacional correcto, não no dia civil.

---

## 5. Gestão de Estado (Zustand)

### 5.1 Store Principal

O ficheiro `src/store/useStore.ts` (5500+ linhas) é o store central da aplicação. Usa Zustand com persistência selectiva:

```typescript
export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Estado
      users: [],
      currentUser: null,
      menu: [],
      categories: [],
      tables: [],
      activeOrders: [],
      customers: [],
      expenses: [],
      // ... mais estado
    }),
    {
      name: 'vereda-store',
      storage: customPersistenceStorage,
      partialize: (state) => ({
        settings: state.settings,
        currentUser: state.currentUser,
        tables: state.tables,
        invoiceCounter: state.invoiceCounter,
        customerDisplayMode: state.customerDisplayMode,
        activeOrders: state.activeOrders,
        customers: state.customers
      })
    }
  )
);
```

### 5.2 Persistência Selectiva

A persistência Zustand guarda apenas dados pequenos no localStorage. Dados grandes (menu, produtos, clientes) são sempre carregados do Supabase:

- **Persistido:** settings, currentUser, tables, invoiceCounter, activeOrders, customers
- **Não persistido:** menu, categories, expenses, staff, notifications (carregados do Supabase)

### 5.3 Stores Auxiliares

| Store | Ficheiro | Função |
|-------|----------|--------|
| `useUserStore` | `src/store/slices/useUserStore.ts` | Gestão de utilizadores e logout |
| `useAuthStore` | `src/store/slices/useAuthStore.ts` | Sessões de autenticação |

### 5.4 Logout

O logout é implementado em duas camadas:

```typescript
// useStore.ts
logout: () => {
  const currentUser = get().currentUser;
  if (currentUser) {
    localStorage.setItem('last-user-session', JSON.stringify({
      user: currentUser,
      logoutTime: new Date().toISOString()
    }));
  }
  useUserStore.getState().logout();  // Limpa currentUser
  useAuthStore.getState().logout();   // Limpa auth
}

// useUserStore.ts
logout: () => {
  localStorage.clear();
  set({ currentUser: null });
}
```

---

## 6. Motor de Sincronização (SyncCore)

### 6.1 Hook useSyncCore

O hook `src/hooks/useSyncCore.ts` (747 linhas) é o motor central de cálculo financeiro. Implementa o padrão **Single Source of Truth**:

```typescript
export const useSyncCore = () => {
  const [syncData, setSyncData] = useState<SyncData>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalExpenses: 0,
    todayExpenses: 0,
    staffCosts: 0,
    netProfit: 0,
    alerts: [],
    predictions: { monthlyForecast: 0, dailyAverage: 0, ... }
  });
  // Cálculos a partir do Supabase
  // ...
};
```

### 6.2 Dados Calculados

| Métrica | Cálculo |
|---------|---------|
| `totalRevenue` | Soma de todas as orders |
| `todayRevenue` | Soma de orders com `data_contabil` = hoje |
| `totalExpenses` | Soma de todas as despesas |
| `todayExpenses` | Soma de despesas de hoje |
| `staffCosts` | Soma de salários + subsídios + bónus + horas extras - descontos |
| `netProfit` | todayRevenue - todayExpenses - staffCosts |
| `topMarginProducts` | Produtos ordenados por margem de lucro |

### 6.3 Inteligência Artificial

O motor inclui alertas e previsões:

- **Alertas:** Avisos automáticos quando métricas atingem thresholds (ex: despesas acima de X% da receita)
- **Previsões:** Forecast mensal baseado em média diária, projecção de fim de mês, tendência de margem

### 6.4 Componentes que usam SyncCore

```
DashboardV2.tsx  → useSyncCore
Finance.tsx      → useSyncCore
ProfitCenter.tsx → useSyncCore
Reports.tsx      → useSyncCore
Compras.tsx      → useSyncCore
```

---

## 7. Terminal POS

### 7.1 Componente Principal

O ficheiro `src/views/POS.tsx` é o componente principal do terminal de venda. Inclui:

- **Mapa de mesas** com zonas (INTERIOR, TERRAÇO, etc.)
- **Carrinho de compras** com adição/remoção de itens
- **Checkout** com múltiplos métodos de pagamento
- **Menu hamburger** com navegação restrita por role
- **Login por PIN** integrado (quando `currentUser` é null)
- **Impressão** de recibos e documentos fiscais

### 7.2 Fluxo de Venda

```
1. Utilizador faz login com PIN
2. Selecciona mesa ou cria pedido
3. Adiciona produtos ao carrinho
4. Aplica descontos (se autorizado)
5. Confirma pagamento (multicaixa/numerário/transferência/cartão)
6. Sistema emite documento fiscal (AGT)
7. Sincroniza com Supabase
8. Imprime recibo
9. Libera a mesa
```

### 7.3 Menu Hamburger com Permissões

O menu hamburger do POS restringe itens conforme o role do utilizador:

- **Operadores (CAIXA, GARCOM, COZINHA):** Dashboard, Terminal POS, Reservas, Despesas, Manual
- **ADMIN / OWNER:** Todos os menus (Centro de Lucro, Eventos, Menu & Stock, Compras, Análises, Configurações, Mesa Layout)

---

## 8. Faturação Eletrónica e AGT

### 8.1 Preparação para Faturação Eletrónica

O **REST IA v1.1.1** está plenamente preparado para **faturação eletrónica** conforme o Decreto Presidencial nº 71/25 de 26 de Fevereiro de 2025. O software implementa todos os requisitos técnicos para emissão, transmissão e armazenamento electrónico de documentos fiscais.

### 8.2 Componentes do Sistema Fiscal

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

### 8.3 Tipos de Documentos Fiscais

Definidos em `src/types/agt.ts`:

| Código | Designação | Uso |
|--------|------------|-----|
| FT | Fatura | Pagamento diferido / B2B |
| FR | Fatura-Recibo | Pagamento imediato (padrão restauração) |
| TV | Talão de Venda | B2C balcão, sem NIF |
| RG | Recibo | Pagamento de dívida faturada |
| NC | Nota de Crédito | Anulação / devolução |
| ND | Nota de Débito | Acréscimo a fatura emitida |

### 8.4 Códigos de IVA

| Código | Designação | Taxa |
|--------|------------|------|
| NOR | Taxa Normal | 14% |
| RED | Taxa Reduzida | 7% |
| ISE | Isento | 0% |
| OUT | Outro | Variável |

### 8.5 Hash e Cadeia de Documentos

Cada documento fiscal recebe um hash SHA-256 único. Documentos subsequentes referenciam o hash anterior, formando uma cadeia inviolável:

```
Documento 1: Hash1 = SHA-256(Dados1)
Documento 2: Hash2 = SHA-256(Dados2 + Hash1)
Documento 3: Hash3 = SHA-256(Dados3 + Hash2)
```

### 8.6 Submissão Electrónica à AGT

O sistema submete documentos à AGT por via electrónica:

- **Submissão assíncrona** via `agtRealService.ts`
- **Fila de retry** automático para submissões falhadas
- **Registo de UUID** e estado de cada submissão
- **Estados:** PENDING → PROCESSING → ACCEPTED / REJECTED / CANCELLED
- **Log auditável** em `agt_compliance_logs`

### 8.7 Funcionamento Offline

Quando offline, o sistema:
1. Emite o documento localmente com hash
2. Armazena na fila `pending_sync_orders`
3. Quando online, submete automaticamente à AGT
4. Actualiza o estado da submissão

---

## 9. Sistema de Permissões e Roles

### 9.1 Roles Disponíveis

| Role | Designação | Permissões |
|------|------------|------------|
| OWNER | Proprietário | Acesso total |
| ADMIN | Administrador | Acesso total excepto configurações críticas |
| GERENTE | Gerente | Gestão operacional |
| SUB_GERENTE | Sub-Gerente | Gestão limitada |
| CAIXA | Operador de Caixa | POS, Dashboard, Reservas, Despesas, Manual |
| GARCOM | Garçom | POS, Dashboard, Reservas, Despesas, Manual |
| COZINHA | Cozinha | POS, Dashboard, Manual |

### 9.2 Autenticação por PIN

O login é feito por PIN (offline, não depende de serviços externos):

1. Utilizador introduz PIN no ecrã do POS
2. Sistema verifica PIN contra lista de utilizadores no store
3. Se válido, define `currentUser` no estado
4. Se `currentUser` é null, mostra ecrã de PIN

### 9.3 Restrições no POS

- **Remover itens do carrinho:** Apenas ADMIN/OWNER
- **Aplicar descontos:** Apenas ADMIN/OWNER/GERENTE
- **Menu hamburger:** Restrito por role (ver secção 7.3)
- **Logout:** Apenas via sidebar da app principal (não no POS)

---

## 10. Persistência Offline

### 10.1 Camadas de Persistência

| Camada | Tecnologia | Conteúdo | Prioridade |
|--------|------------|----------|------------|
| 1 (Primária) | Supabase (PostgreSQL) | Todos os dados | Fonte de verdade |
| 2 (Local) | SQLite (sql.js/WASM) | Estado, orders, expenses, cash_flow, staff | Backup offline |
| 3 (Sessão) | localStorage (Zustand) | settings, currentUser, activeOrders, customers | Sessão rápida |
| 4 (Backup) | IndexedDB | activeOrders (backup contra falhas) | Recuperação |

### 10.2 SQLite Local (sql.js)

O `src/lib/sqliteService.ts` usa sql.js (SQLite compilado para WebAssembly):

```typescript
class SqliteService {
  async init(): Promise<boolean> {
    this.SQL = await initSqlJs({ locateFile: ... });
    const savedDb = localStorage.getItem('rest_ia_sqlite_db');
    if (savedDb) {
      this.db = new this.SQL.Database(data);
    } else {
      this.db = new this.SQL.Database();
    }
    this.createTables();
  }
}
```

Tabelas locais: `application_state`, `orders`, `expenses`, `cash_flow`, `staff`

### 10.3 Fila de Sincronização Offline

O `src/lib/sync/offlineSync.ts` implementa uma fila de sincronização:

- **Eventos online/offline** detectados automaticamente
- **Sync automático** a cada 30 segundos quando online
- **Fila de operações** (insert/update/delete) processada em ordem
- **Retry** de itens falhados

### 10.4 Pedidos Pendentes

O `src/lib/sync/pendingSyncOrders.ts` gere pedidos pendentes:

- **Congelamento de dias passados:** Orders de dias anteriores não podem ser sincronizadas
- **Verificação de dias fechados:** Via RPC `get_closed_days_safe`
- **Marcação de dia fechado:** Via RPC `mark_day_closed_safe`

---

## 11. Impressão Térmica

### 11.1 Suporte

- Impressoras térmicas 58mm e 80mm
- Impressão em A4
- Pré-visualização antes da impressão
- Reimpressão a partir do histórico

### 11.2 Conteúdo do Recibo

- Cabeçalho com identificação do estabelecimento (NIF, nome, morada)
- Número do documento e série
- Data e hora de emissão
- Linhas com produtos, quantidades, preços
- Totais (líquido, IVA, bruto)
- Hash do documento
- Método de pagamento
- Rodapé: "REST IA v1.1.1 by Helder Neto"

---

## 12. Rotas e Navegação

### 12.1 Rotas da Aplicação (App.tsx)

| Rota | Componente | Acesso |
|------|------------|--------|
| `/login` | Login | Livre |
| `/` | DashboardV2 | Autenticado |
| `/dashboard` | DashboardV2 | Autenticado |
| `/pos` | POS | Autenticado |
| `/printer-config` | PrinterConfig | Autenticado |
| `/agt` | AGTControl | Autenticado |
| `/agt/certification` | CertificationDashboard | Autenticado |
| `/agt/compliance` | ComplianceReports | Autenticado |
| `/profit-center` | ProfitCenter | Autenticado |
| `/tables-layout` | TableLayout | Autenticado |
| `/inventory` | Inventory | Autenticado |
| `/compras` | Purchases | Autenticado |
| `/compras/owner/:id` | PurchaseApproval | Autenticado |
| `/finance` | Finance | Autenticado |
| `/analytics` | Analytics | Autenticado |
| `/reports` | Reports | Autenticado |
| `/employees` | Employees | Autenticado |
| `/reservations` | Reservations | Autenticado |
| `/events` | Events | Autenticado |
| `/sales-control` | SalesControl | Autenticado |
| `/settings` | SystemHub | Autenticado |
| `/manual` | Manual | Autenticado |
| `/menu` | PublicMenu | Livre |
| `/menu/:tableId` | PublicMenu | Livre |
| `/owner/login` | OwnerLogin | Livre |
| `/owner/dashboard` | OwnerDashboard | AuthGuard |
| `/customer-display/:tableId` | CustomerDisplay | Livre |

### 12.2 Rotas Electron (App_tauri.tsx)

| Rota | Componente |
|------|------------|
| `/` | Redirect → `/pos` |
| `/pos` | POS |
| `/owner` | Redirect → `/owner/dashboard` |
| `/owner/login` | OwnerLogin |
| `/owner/dashboard` | AuthGuard → OwnerDashboard |
| `/reservations` | Reservations |
| Outras | Lazy-loaded |

### 12.3 Lazy Loading

A maioria das views usa `React.lazy()` para code-splitting:

```typescript
const POS = lazy(() => import('./views/POS'));
const DashboardV2 = lazy(() => import('./views/DashboardV2'));
const Finance = lazy(() => import('./views/Finance'));
// ... etc
```

---

## 13. Estrutura de Ficheiros

```
rest-ia-Tasca do Vereda/
├── main.cjs                          # Entry point Electron
├── package.json                      # Dependências e scripts
├── electron-builder.json             # Configuração do instalador NSIS
├── vite.config.ts                    # Configuração Vite
├── tailwind.config.js                # Configuração TailwindCSS
├── tsconfig.json                     # Configuração TypeScript
├── App.tsx                           # App principal (Web)
├── src/
│   ├── App_tauri.tsx                 # App principal (Electron)
│   ├── supabase_standalone.ts        # Cliente Supabase único
│   ├── types/
│   │   └── agt.ts                    # Tipos de documentos fiscais AGT
│   ├── store/
│   │   ├── useStore.ts               # Store principal Zustand (5500+ linhas)
│   │   └── slices/
│   │       ├── useUserStore.ts       # Slice de utilizadores
│   │       └── useAuthStore.ts       # Slice de autenticação
│   ├── hooks/
│   │   ├── useSyncCore.ts            # Motor de cálculo financeiro (747 linhas)
│   │   └── useAGT.ts                 # Hook para faturação AGT
│   ├── lib/
│   │   ├── sqliteService.ts          # SQLite local (sql.js/WASM)
│   │   ├── supabaseDataLoader.ts     # Carregamento de dados do Supabase
│   │   ├── dateUtils.ts              # Cálculo de dia operacional
│   │   ├── agt/
│   │   │   ├── documentService.ts    # Geração de documentos fiscais
│   │   │   ├── agtRealService.ts     # Submissão electrónica à AGT
│   │   │   ├── agtSignatureService.ts# Hash e cadeia de documentos
│   │   │   ├── agtSeriesService.ts   # Gestão de séries
│   │   │   ├── agtComplianceLogService.ts # Log auditável
│   │   │   └── agtTestService.ts     # Testes de conformidade
│   │   ├── sync/
│   │   │   ├── offlineSync.ts        # Fila de sincronização offline
│   │   │   ├── pendingSyncOrders.ts  # Pedidos pendentes de sync
│   │   │   └── activeOrdersBackup.ts # Backup de ordens ativas
│   │   └── database/
│   │       └── databaseService.ts    # Serviço de base de dados
│   ├── views/
│   │   ├── POS.tsx                   # Terminal POS
│   │   ├── DashboardV2.tsx           # Dashboard analytics
│   │   ├── Finance/
│   │   │   ├── index.tsx             # Shell financeiro com tabs
│   │   │   ├── types.ts              # Tipos financeiros
│   │   │   ├── utils.ts              # Utilitários financeiros
│   │   │   └── AGTDocumentsTab.tsx   # Tab de documentos AGT
│   │   ├── Inventory.tsx             # Controlo de stock
│   │   ├── ProfitCenter.tsx          # Centro de lucro
│   │   ├── Purchases.tsx             # Gestão de compras
│   │   ├── Analytics.tsx             # Análises com IA
│   │   ├── Reports.tsx               # Relatórios
│   │   ├── Employees.tsx             # Gestão de equipa
│   │   ├── Reservations.tsx          # Reservas
│   │   ├── Events.tsx                # Eventos
│   │   ├── AGTControl.tsx            # Painel AGT
│   │   ├── AGTConfig.tsx             # Configuração fiscal
│   │   ├── SystemHub.tsx             # Hub do sistema
│   │   ├── Manual.tsx                # Manual do utilizador
│   │   ├── TableLayout.tsx           # Layout de mesas
│   │   └── SalesControl.tsx          # Controlo de vendas
│   └── components/
│       ├── Sidebar.tsx               # Barra lateral de navegação
│       ├── AuthGuard.tsx             # Guarda de rotas autenticadas
│       ├── ShiftManager.tsx          # Gestão de turnos
│       ├── DailyCloseReport.tsx      # Relatório de fecho do dia
│       └── ...                       # Outros componentes
├── docs/
│   ├── AGT_CERTIFICACAO_REST_IA_v1.1.1.md  # Documento de certificação AGT
│   └── DOCUMENTACAO_TECNICA_REST_IA_v1.1.1.md # Esta documentação
├── scripts/
│   ├── prebuild-clean.js             # Limpeza pré-build
│   ├── cleanup-build.js              # Limpeza pós-build
│   └── database/                     # Scripts de base de dados
└── supabase/
    └── schema.sql                    # Schema do PostgreSQL
```

---

## 14. Segurança

### 14.1 Autenticação

- **Login por PIN** (offline, não depende de serviços externos)
- **Owner Login** separado (Supabase Auth com email/password)
- **AuthGuard** protege rotas de owner

### 14.2 Protecção de Dados

- **Row Level Security (RLS)** ativo no Supabase
- **Variáveis de ambiente** isoladas (`.env.local`)
- **Tokens** geridos pelo Supabase Auth
- **Cliente Supabase** isolado em `supabase_standalone.ts`

### 14.3 Integridade Fiscal

- Documentos emitidos **não podem ser alterados**
- **Hash em cadeia** impede adulteração retroactiva
- **Log de conformidade** regista todas as operações
- **Backups automáticos** de sessão e ordens ativas

### 14.4 Assinatura do Instalador

O instalador Windows (`TascaVereda-Setup-1.1.1.exe`) é assinado com `signtool.exe`, garantindo:
- Identidade do publicador
- Integridade do instalador
- Não-repúdio

---

## 15. Build e Deployment

### 15.1 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `concurrently "vite" "electron ."` | Desenvolvimento |
| `build` | `vite build` | Build de produção |
| `build:vercel` | `vite build --mode production` | Build para Vercel |
| `build:frontend` | `vite build --mode production` | Build frontend |
| `electron:dev` | `concurrently "npm run dev" "wait-on ..."` | Dev com Electron |
| `build:electron` | `npm run build && electron-builder` | Build Electron |
| `build:electron:win` | `npm run build && electron-builder --win` | Build Windows |
| `build:msi` | `node scripts/prebuild-clean.js && npm run build:frontend && electron-builder --win nsis` | Build instalador NSIS |

### 15.2 Deploy Vercel

```bash
npx vercel --prod --yes
```

URL de produção: https://rest-ia.vercel.app

### 15.3 Build Electron (NSIS)

```bash
npm run build:msi
```

Gera: `dist/installers/TascaVereda-Setup-1.1.1.exe`

### 15.4 Configuração electron-builder.json

```json
{
  "appId": "com.tascavereda.restia",
  "productName": "Tasca Vereda",
  "directories": { "output": "dist/installers" },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Tasca Vereda",
    "artifactName": "TascaVereda-Setup-${version}.exe"
  }
}
```

---

## 16. Requisitos do Sistema

### 16.1 Desktop (Windows)

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| Sistema Operativo | Windows 10 (64-bit) | Windows 11 (64-bit) |
| Memória RAM | 4 GB | 8 GB |
| Espaço em Disco | 500 MB | 1 GB |
| Processador | Dual-core 2.0 GHz | Quad-core 2.5 GHz |
| Impressora | Térmica 80mm ou A4 | Térmica 80mm |
| Internet | Opcional (offline-first) | Recomendada |

### 16.2 Web

| Requisito | Mínimo |
|-----------|--------|
| Navegador | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |
| Memória RAM | 2 GB |
| Internet | Necessária (Supabase-first) |

---

## 17. Informações de Contacto

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

*REST IA v1.1.1 — © 2025 Helder Neto. Todos os direitos reservados.*

*Documentação técnica gerada para fins de certificação e auditoria do software.*
