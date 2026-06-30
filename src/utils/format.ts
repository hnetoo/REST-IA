// Formatação de moeda para Angola
export const formatKz = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0 Kz';
  }
  
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(value);
};

// Formatação de percentagem
export const formatPercent = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }
  
  return `${value.toFixed(1)}%`;
};

// Formatação de data
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }
  
  return dateObj.toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Formatação de data e hora
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Data inválida';
  }
  
  return dateObj.toLocaleString('pt-AO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Valor seguro para evitar undefined
export const safeValue = <T>(value: T | undefined, defaultValue: T): T => {
  return value !== undefined && value !== null ? value : defaultValue;
};

// Calcular cor baseada no valor (positivo/negativo)
export const getProfitColor = (value: number): string => {
  return value >= 0 ? 'text-green-400' : 'text-red-400';
};

// Calcular cor baseada na percentagem
export const getPercentColor = (value: number, thresholds = { good: 70, warning: 40 }): string => {
  if (value >= thresholds.good) return 'text-green-400';
  if (value >= thresholds.warning) return 'text-yellow-400';
  return 'text-red-400';
};
