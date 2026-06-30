// FUNÇÕES DE KWANZA (AKZ) E DATAS

export const formatKz = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString; // Retorna original se falhar
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString; // Retorna original se falhar
  }
};

export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getTodayDateTime = (): string => {
  return new Date().toISOString();
};

export const parseAmount = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove formatação e converte
  const cleaned = value.toString().replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};
