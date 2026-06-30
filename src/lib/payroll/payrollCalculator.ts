/**
 * Motor de Cálculo de Salários — Angola
 * Conforme OGE 2024 / CIRT (Código do Imposto sobre o Rendimento do Trabalho)
 *
 * Regras aplicadas:
 * - INSS: 3% do trabalhador sobre base (salário base + bónus, sem subsídios)
 * - INSS patronal: 8% do empregador sobre mesma base
 * - IRT: tabela progressiva 12 escalões, matéria coletável = bruto - INSS
 * - Isenção: até 100.000 Kz de matéria coletável
 */

export interface PayrollInput {
  baseSalary: number;        // Salário base contratual
  foodAllowance: number;     // Subsídio alimentação (não sujeito INSS)
  transportAllowance: number;// Subsídio transporte (não sujeito INSS)
  bonus: number;             // Bónus / gratificações (sujeito INSS)
  overtimeAmount: number;    // Valor horas extras
  otherDiscounts: number;    // Descontos manuais (faltas, atrasos)
  irtExempt: boolean;        // Isento de IRT (deficiente/combatente)
}

export interface PayrollResult {
  grossSalary: number;       // Bruto = base + subsídios + bónus + extras
  baseINSS: number;          // Base INSS = base + bónus
  inssWorker: number;        // 3% do trabalhador
  inssEmployer: number;      // 8% do empregador
  taxableIncome: number;     // Matéria coletável IRT = bruto - INSS
  irtAmount: number;         // IRT calculado
  irtBracket: number;        // Escalão aplicado (0 = isento)
  irtRate: number;           // Taxa percentual aplicada
  totalDeductions: number;   // INSS + IRT + outros descontos
  netSalary: number;         // Líquido = bruto - deduções
  employerCost: number;      // Custo total = bruto + INSS patronal
}

export interface IRTBracket {
  bracket: number;
  min: number;
  max: number;
  rate: number;
}

// Tabela IRT 2024 — OGE Angola (12 escalões)
export const DEFAULT_IRT_BRACKETS: IRTBracket[] = [
  { bracket: 1,  min: 0,          max: 100000,    rate: 0.00 },
  { bracket: 2,  min: 100001,     max: 150000,    rate: 0.13 },
  { bracket: 3,  min: 150001,     max: 200000,    rate: 0.16 },
  { bracket: 4,  min: 200001,     max: 300000,    rate: 0.19 },
  { bracket: 5,  min: 300001,     max: 500000,    rate: 0.21 },
  { bracket: 6,  min: 500001,     max: 1000000,   rate: 0.23 },
  { bracket: 7,  min: 1000001,    max: 2000000,   rate: 0.24 },
  { bracket: 8,  min: 2000001,    max: 3000000,   rate: 0.245 },
  { bracket: 9,  min: 3000001,    max: 5000000,   rate: 0.2475 },
  { bracket: 10, min: 5000001,    max: 7000000,   rate: 0.25 },
  { bracket: 11, min: 7000001,    max: 10000000,  rate: 0.25 },
  { bracket: 12, min: 10000001,   max: Infinity,  rate: 0.25 }
];

// Taxas INSS
export const INSS_WORKER_RATE = 0.03;
export const INSS_EMPLOYER_RATE = 0.08;
export const INSS_EXEMPTION_THRESHOLD = 100000; // Isenção IRT até 100k

/**
 * Calcula o IRT progressivo com base na matéria coletável
 */
export function calculateIRT(
  taxableIncome: number,
  brackets: IRTBracket[] = DEFAULT_IRT_BRACKETS,
  isExempt: boolean = false
): { amount: number; bracket: number; rate: number } {
  if (isExempt || taxableIncome <= INSS_EXEMPTION_THRESHOLD) {
    return { amount: 0, bracket: 0, rate: 0 };
  }

  for (const b of brackets) {
    if (taxableIncome >= b.min && taxableIncome <= b.max) {
      return {
        amount: Math.round(taxableIncome * b.rate),
        bracket: b.bracket,
        rate: b.rate
      };
    }
  }

  // Fallback para o último escalão
  const last = brackets[brackets.length - 1];
  return {
    amount: Math.round(taxableIncome * last.rate),
    bracket: last.bracket,
    rate: last.rate
  };
}

/**
 * Calcula o INSS (trabalhador e empregador)
 */
export function calculateINSS(baseAmount: number): {
  worker: number;
  employer: number;
} {
  return {
    worker: Math.round(baseAmount * INSS_WORKER_RATE),
    employer: Math.round(baseAmount * INSS_EMPLOYER_RATE)
  };
}

/**
 * Motor principal — calcula toda a folha de um funcionário
 */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const {
    baseSalary,
    foodAllowance,
    transportAllowance,
    bonus,
    overtimeAmount,
    otherDiscounts,
    irtExempt
  } = input;

  // 1. Salário Bruto
  const grossSalary = baseSalary + foodAllowance + transportAllowance + bonus + overtimeAmount;

  // 2. Base INSS (salário base + bónus — subsídios excluídos em Angola)
  const baseINSS = baseSalary + bonus;
  const inss = calculateINSS(baseINSS);

  // 3. Matéria coletável IRT (bruto - INSS trabalhador)
  const taxableIncome = grossSalary - inss.worker;

  // 4. IRT
  const irt = calculateIRT(taxableIncome, DEFAULT_IRT_BRACKETS, irtExempt);

  // 5. Total deduções e líquido
  const totalDeductions = inss.worker + irt.amount + otherDiscounts;
  const netSalary = grossSalary - totalDeductions;
  const employerCost = grossSalary + inss.employer;

  return {
    grossSalary,
    baseINSS,
    inssWorker: inss.worker,
    inssEmployer: inss.employer,
    taxableIncome,
    irtAmount: irt.amount,
    irtBracket: irt.bracket,
    irtRate: irt.rate,
    totalDeductions,
    netSalary,
    employerCost
  };
}

/**
 * Formata valores monetários para Kwanzas
 */
export function formatKz(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0
  }).format(value).replace('AOA', '').trim() + ' Kz';
}

/**
 * Gera número de recibo sequencial
 */
export function generateReceiptNumber(
  staffId: string,
  monthYear: string,
  sequence: number
): string {
  const [year, month] = monthYear.split('-');
  const seq = String(sequence).padStart(3, '0');
  return `RV-${year}-${month}-${seq}`;
}

/**
 * Gera hash simples para validação do recibo
 */
export function generateReceiptHash(data: {
  staffId: string;
  monthYear: string;
  grossSalary: number;
  netSalary: number;
  timestamp: string;
}): string {
  const raw = `${data.staffId}|${data.monthYear}|${data.grossSalary}|${data.netSalary}|${data.timestamp}`;
  // Simple hash (em produção usar crypto.subtle ou similar)
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
