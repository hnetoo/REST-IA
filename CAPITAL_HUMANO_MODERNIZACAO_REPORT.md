# Relatório de Modernização — Capital Humano & Recibos Salariais
## Conforme Legislação Angolana (OGE 2024 / DP 71/25)

**Data:** 06 de Junho de 2026  
**Versão:** 1.0 — Para Aprovação  
**Responsável:** Rest IA OS Development Team

---

## 1. Diagnóstico do Estado Atual

### 1.1 Funcionalidades Existentes

| Funcionalidade | Estado | Problema |
|---------------|--------|----------|
| Cadastro de funcionários | ✅ Funciona | Falta NIF, data de admissão, tipo de contrato |
| Subsídios (alimentação, transporte, bónus) | ✅ Funciona | Bem implementado |
| Escalas de turno | ✅ Funciona | — |
| Ponto & picagem | ✅ Funciona | — |
| Processamento de folha | ⚠️ Parcial | **NÃO calcula IRT nem INSS automaticamente** |
| Recibo salarial PDF | ❌ TODO | Apenas placeholder, não gera documento real |
| Exportação de folha | ✅ Funciona | Mas não tem deduções fiscais |

### 1.2 Cálculo Atual (INCORRETO perante a lei)

```
Salário Líquido = Salário Base + Subsídios + Horas Extras - Descontos Manuais
                ↑
                FALTA: INSS (3%) + IRT (progressivo)
```

**Problema crítico:** O sistema atual permite pagar salários sem reter os impostos obrigatórios, expondo o restaurante a sanções da AGT.

---

## 2. Legislação Angolana Aplicável

### 2.1 IRT — Imposto sobre Rendimentos do Trabalho

**Base legal:** OGE 2024 (Diário da República, 29 Dez 2023)

| Escalão | Rendimento Mensal (Kz) | Taxa | Dedução |
|---------|------------------------|------|---------|
| 1 | Até 100.000 | **Isento** | — |
| 2 | 100.001 — 150.000 | 13% | — |
| 3 | 150.001 — 200.000 | 16% | — |
| 4 | 200.001 — 300.000 | 19% | — |
| 5 | 300.001 — 500.000 | 21% | — |
| 6 | 500.001 — 1.000.000 | 23% | — |
| 7 | 1.000.001 — 2.000.000 | 24% | — |
| 8 | 2.000.001 — 3.000.000 | 24,5% | — |
| 9 | 3.000.001 — 5.000.000 | 24,75% | — |
| 10 | 5.000.001 — 7.000.000 | 25% | — |
| 11 | 7.000.001 — 10.000.000 | 25% | — |
| 12 | Acima de 10.000.000 | 25% | — |

> **Nota:** A tabela reduziu de 13 para 12 escalões em 2024. A isenção subiu de 70.000 Kz para **100.000 Kz**.

### 2.2 INSS — Segurança Social

| Entidade | Taxa | Base de Cálculo |
|----------|------|-----------------|
| Trabalhador (desconto) | **3%** | Salário bruto (sem subsídios) |
| Empregador (encargo) | **8%** | Salário bruto (sem subsídios) |
| **Total** | **11%** | — |

> **Nota:** Subsídios de alimentação e transporte NÃO integram a base de cálculo do INSS em Angola (salvo bónus e outras remunerações).

### 2.3 Modelo de Cálculo Correto

```
SALÁRIO BRUTO = Salário Base + Subsídios (alimentação + transporte) + Bónus

BASE INSS = Salário Base + Bónus  (subsídios excluídos)
INSS (3%) = BASE INSS × 0.03

MATÉRIA COLETÁVEL IRT = SALÁRIO BRUTO - INSS (3%)
IRT = Aplicar tabela progressiva à matéria coletável

SALÁRIO LÍQUIDO = SALÁRIO BRUTO - INSS - IRT - Outros Descontos

ENCARGO EMPREGADOR = Salário Base × 0.08 (INSS patronal)
CUSTO TOTAL = SALÁRIO BRUTO + ENCARGO EMPREGADOR
```

**Exemplo prático (Garçom):**
```
Salário Base:        150.000 Kz
Subsídio Alimentação: 20.000 Kz
Subsídio Transporte:  15.000 Kz
─────────────────────────────────
SALÁRIO BRUTO:       185.000 Kz

BASE INSS:           150.000 Kz  (apenas base)
INSS (3%):            -4.500 Kz

MATÉRIA COLETÁVEL:   180.500 Kz  (bruto - INSS)
IRT (16% escalão 3): -28.880 Kz

SALÁRIO LÍQUIDO:     151.620 Kz

ENCARGO EMPREGADOR:   12.000 Kz  (150.000 × 8%)
CUSTO TOTAL:         197.000 Kz
```

---

## 3. Mudanças Propostas

### 3.1 Fase 1 — Modal de Funcionário (Cadastro)

```
┌─────────────────────────────────────────────────────────────┐
│  NOVO FUNCIONÁRIO                                    [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Dados Pessoais                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Nome Completo   │  │ NIF *           │  ← NOVO         │
│  │ [              ]│  │ [              ]│  (obrigatório)  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Telefone        │  │ Data Admissão * │  ← NOVO         │
│  │ [              ]│  │ [  DD/MM/AAAA  ]│                 │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Cargo           │  │ Tipo Contrato * │  ← NOVO         │
│  │ [  Garçom ▼  ]│  │ [Indefinido ▼ ]│                 │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  Remuneração                                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Salário Base *  │  │ Taxa Horas Extra│  (existente)   │
│  │ [   0     Kz  ]│  │ [   0     Kz  ]│                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  Subsídios                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Alimentação     │  │ Transporte      │  │ Bónus        │ │
│  │ [   0     Kz  ]│  │ [   0     Kz  ]│  │ [ 0   Kz ]  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
│  Configuração Fiscal  ← NOVO                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☑ Calcular INSS automaticamente (3% do trabalhador) │  │
│  │ ☑ Calcular IRT automaticamente (tabela progressiva)  │  │
│  │ ☐ Funcionário isento de IRT (deficiente/combatente)  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ PRÉVIA DO SALÁRIO          (nova secção)              │  │
│  │                                                       │  │
│  │  Salário Base:              150.000 Kz                │  │
│  │  + Subsídios:              + 35.000 Kz                │  │
│  │  ─────────────────────────────────────                │  │
│  │  = Salário Bruto:           185.000 Kz                │  │
│  │  - INSS (3%):              -  4.500 Kz                │  │
│  │  - IRT (16%):              - 28.880 Kz                │  │
│  │  ─────────────────────────────────────                │  │
│  │  = SALÁRIO LÍQUIDO:         151.620 Kz ✓              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                    [Cancelar]  [Gravar Funcionário]         │
└─────────────────────────────────────────────────────────────┘
```

**Novos campos na tabela `staff`:**
```sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS nif VARCHAR(20);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'INDEFINIDO';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS irt_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auto_calculate_tax BOOLEAN DEFAULT TRUE;
```

### 3.2 Fase 2 — Folha de Salário (PAYROLL)

```
┌──────────────────────────────────────────────────────────────────────┐
│  FOLHA DE SALÁRIO — Junho 2026              [Exportar] [Processar]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Funcionário     Base       Subsídios   INSS(3%)   IRT      Líquido│
│  ──────────────────────────────────────────────────────────────────  │
│  Maria G.      150.000      35.000      4.500    28.880   151.620   │
│  João S.       250.000      45.000      7.500    52.250   235.250   │
│  Ana P.         80.000      20.000      2.400       0     97.600   │ ← Isenta (≤100k)
│  Carlos M.     500.000      60.000     15.000   122.250   422.750   │
│  ──────────────────────────────────────────────────────────────────  │
│  TOTAIS        980.000     160.000     29.400   203.380   906.620   │
│                                                                      │
│  ENCARGO EMPREGADOR (INSS 8%): 78.400 Kz                             │
│  CUSTO TOTAL MENSAL:          985.020 Kz                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Novas colunas na tabela `salary_payments`:**
```sql
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS inss_worker DECIMAL(12,2) DEFAULT 0;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS inss_employer DECIMAL(12,2) DEFAULT 0;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS irt_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS gross_salary DECIMAL(12,2) DEFAULT 0;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS taxable_income DECIMAL(12,2) DEFAULT 0;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS irt_bracket INTEGER DEFAULT 0;
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS receipt_hash VARCHAR(64);
```

### 3.3 Fase 3 — Recibo Salarial (PDF / Impressão)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECIBO DE VENCIMENTO                          │
│                    RESTAURANTE TASCA DO VEREDA                        │
│                         NIF: 5000123456                               │
│                          Luanda, Angola                               │
├─────────────────────────────────────────────────────────────────────┤
│  Funcionário: Maria Gonçalves          NIF: 0061234567LA041         │
│  Cargo: Garçom                         Período: 01/06/2026 — 30/06/2026│
│  Data de Emissão: 30/06/2026           Recibo Nº: RV-2026-06-001   │
├─────────────────────────────────────────────────────────────────────┤
│  DISCRIMINAÇÃO                            VALOR (Kz)                │
│  ─────────────────────────────────────────────────────────────────  │
│  SALÁRIO BASE                              150.000,00               │
│  Subsídio de Alimentação                    20.000,00               │
│  Subsídio de Transporte                     15.000,00               │
│  ─────────────────────────────────────────────────────────────────  │
│  TOTAL VENCIMENTOS (BRUTO)                 185.000,00            │
│  ─────────────────────────────────────────────────────────────────  │
│  DESCONTOS OBRIGATÓRIOS                                             │
│  INSS (3% sobre base de 150.000)            -4.500,00               │
│  IRT (16% — Escalão 3, Mat. Colet. 180.500) -28.880,00             │
│  ─────────────────────────────────────────────────────────────────  │
│  TOTAL DESCONTOS                            -33.380,00            │
│  ═════════════════════════════════════════════════════════════════  │
│  SALÁRIO LÍQUIDO A RECEBER                 151.620,00             │
│  ═════════════════════════════════════════════════════════════════  │
│                                                                     │
│  Declaro que recebi a importância supra referida.                   │
│                                                                     │
│  _________________________              _________________________  │
│  Assinatura do Funcionário              Assinatura do Empregador    │
│                                                                     │
│  [QR Code AGT]  Hash: a3f7b2...9d1e                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Requisitos do recibo (Lei Angolana):**
1. ✅ Identificação da entidade empregadora (nome, NIF, morada)
2. ✅ Identificação do trabalhador (nome, NIF, cargo)
3. ✅ Período de referência (mês/ano)
4. ✅ Natureza e valor de todos os vencimentos
5. ✅ Natureza, valor e percentagem dos descontos
6. ✅ Valor líquido a receber
7. ✅ Data de emissão e número sequencial do recibo
8. ✅ Espaço para assinatura do trabalhador

### 3.4 Fase 4 — Configuração Fiscal (SystemHub)

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURAÇÃO FISCAL — CAPITAL HUMANO                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tabela de IRT (editável)                                   │
│  ┌──────────┬───────────────────────┬───────┐              │
│  │ Escalão  │ Rendimento (Kz)       │ Taxa  │              │
│  │ 1        │ Até 100.000             │ 0%    │ ← Isento    │
│  │ 2        │ 100.001 — 150.000       │ 13%   │              │
│  │ 3        │ 150.001 — 200.000       │ 16%   │              │
│  │ ...      │ ...                     │ ...   │              │
│  │ 12       │ Acima de 10.000.000     │ 25%   │              │
│  └──────────┴───────────────────────┴───────┘              │
│                                                             │
│  Segurança Social                                           │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Trabalhador: 3% │  │ Empregador: 8%  │                  │
│  │ [    3   ]%     │  │ [    8   ]%     │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  [Restaurar Padrão Angola]    [Guardar Configuração]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Especificação Técnica

### 4.1 Novas Tabelas/Colunas no Supabase

**Tabela `staff` (colunas novas):**
| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `nif` | VARCHAR(20) | NULL | NIF do funcionário |
| `admission_date` | DATE | NULL | Data de admissão |
| `contract_type` | VARCHAR(50) | 'INDEFINIDO' | Tipo de contrato |
| `irt_exempt` | BOOLEAN | FALSE | Isento de IRT |
| `auto_calculate_tax` | BOOLEAN | TRUE | Calcular impostos auto |

**Tabela `salary_payments` (colunas novas):**
| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `inss_worker` | DECIMAL(12,2) | 0 | INSS do trabalhador |
| `inss_employer` | DECIMAL(12,2) | 0 | INSS do empregador |
| `irt_amount` | DECIMAL(12,2) | 0 | Valor do IRT |
| `gross_salary` | DECIMAL(12,2) | 0 | Salário bruto |
| `taxable_income` | DECIMAL(12,2) | 0 | Matéria coletável IRT |
| `irt_bracket` | INTEGER | 0 | Escalão IRT aplicado |
| `receipt_number` | VARCHAR(50) | NULL | Nº sequencial do recibo |
| `receipt_hash` | VARCHAR(64) | NULL | Hash do recibo |

**Nova Tabela `irt_config`:**
```sql
CREATE TABLE irt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket INTEGER NOT NULL,
  min_amount DECIMAL(12,2) NOT NULL,
  max_amount DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Novos Componentes React

| Componente | Localização | Descrição |
|------------|-------------|-----------|
| `PayrollCalculator` | `lib/payroll/` | Motor de cálculo de salários |
| `PayslipGenerator` | `lib/payroll/` | Gerador de recibos PDF |
| `IRTConfigPanel` | `views/SystemHub/` | Painel de configuração fiscal |
| `TaxPreview` | `components/` | Pré-visualização de cálculo fiscal |

### 4.3 Algoritmo de Cálculo IRT

```typescript
function calculateIRT(grossSalary: number, inssAmount: number): { 
  amount: number; 
  bracket: number; 
  rate: number;
} {
  const taxableIncome = grossSalary - inssAmount;
  
  // Tabela IRT 2024 (Angola)
  const brackets = [
    { min: 0,      max: 100000,   rate: 0.00 },  // Isento
    { min: 100001, max: 150000,   rate: 0.13 },
    { min: 150001, max: 200000,   rate: 0.16 },
    { min: 200001, max: 300000,   rate: 0.19 },
    { min: 300001, max: 500000,   rate: 0.21 },
    { min: 500001, max: 1000000,  rate: 0.23 },
    { min: 1000001, max: Infinity, rate: 0.25 }  // Simplificado
  ];
  
  for (let i = 0; i < brackets.length; i++) {
    if (taxableIncome >= brackets[i].min && taxableIncome <= brackets[i].max) {
      return {
        amount: Math.round(taxableIncome * brackets[i].rate),
        bracket: i + 1,
        rate: brackets[i].rate
      };
    }
  }
  
  return { amount: 0, bracket: 0, rate: 0 };
}
```

---

## 5. Fluxo de Trabalho Proposto

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. CADASTRAR   │────▶│  2. CONFIGURAR  │────▶│  3. PROCESSAR   │
│   FUNCIONÁRIO   │     │    FISCAL       │     │    FOLHA        │
│                 │     │                 │     │                 │
│  • Nome         │     │  • Tabela IRT   │     │  • Selecionar   │
│  • NIF          │     │  • Taxa INSS    │     │    mês          │
│  • Salário base │     │  • Subsídios    │     │  • Revisar      │
│  • Subsídios    │     │                 │     │    cálculos     │
│  • Contrato     │     │                 │     │  • Confirmar    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  4. EMITIR      │
                                               │   RECIBO PDF    │
                                               │                 │
                                               │  • Individual   │
                                               │  • Lote (todos) │
                                               │  • Imprimir     │
                                               │  • Arquivar     │
                                               └─────────────────┘
```

---

## 6. Cronograma de Implementação

| Fase | Tarefa | Estimativa | Dependências |
|------|--------|------------|--------------|
| 1 | Adicionar campos ao modal de funcionário | 2h | — |
| 2 | Criar tabelas/colunas no Supabase | 1h | — |
| 3 | Implementar motor de cálculo (IRT + INSS) | 3h | Fase 1-2 |
| 4 | Atualizar folha de salário com deduções | 2h | Fase 3 |
| 5 | Criar gerador de recibo PDF | 4h | Fase 4 |
| 6 | Criar configuração fiscal no SystemHub | 2h | — |
| 7 | TypeScript check + Vite build | 1h | Todas |
| 8 | Testes e ajustes finais | 2h | Todas |
| | **TOTAL ESTIMADO** | **~17h** | |

---

## 7. Riscos e Considerações

| Risco | Mitigação |
|-------|-----------|
| Mudança da tabela IRT pelo Governo | Configuração editável no SystemHub |
| Funcionários isentos (deficientes) | Campo `irt_exempt` no cadastro |
| Subsídios que integram base INSS | Documentação clara na interface |
| Conformidade AGT dos recibos | Seguir estrutura mínima exigida por lei |
| Backward compatibility | Migrar dados existentes com `auto_calculate_tax = FALSE` |

---

## 8. Próximos Passos

1. **Aprovar este relatório** (você está aqui)
2. Criar migration SQL no Supabase
3. Implementar as 8 fases descritas
4. Testar com dados reais de funcionários
5. Gerar primeiro recibo PDF de teste
6. Deploy e validação

---

**Preparado por:** Rest IA OS  
**Para aprovação de:** Helder Neto  
**Status:** ⏳ Aguardando aprovação para iniciar implementação
