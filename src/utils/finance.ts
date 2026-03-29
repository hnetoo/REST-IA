// UTILITÁRIOS FINANCEIROS - PROIBIDO CÁLCULOS NOS COMPONENTES

export const calculateTax = (amount: number, rate: number = 0.07): number => {
  return amount * rate;
};

export const calculateNetRevenue = (grossRevenue: number, expenses: number, tax: number): number => {
  return grossRevenue - expenses - tax;
};

export const calculateProfitMargin = (netRevenue: number, grossRevenue: number): number => {
  return grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
};

export const formatKz = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
};

export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const isValidEstablishmentId = (id: string): boolean => {
  return id && id.length > 0 && id !== '00000000-0000-0000-0000-000000000000';
};
