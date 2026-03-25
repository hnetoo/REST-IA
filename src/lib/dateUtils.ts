import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Timezone padrão da aplicação
export const APP_TIMEZONE = 'Africa/Luanda';

/**
 * Obtém o início do dia no timezone da aplicação
 */
export const getStartOfDayInAppTimezone = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  const startOfDayZoned = startOfDay(zonedDate);
  return startOfDayZoned;
};

/**
 * Obtém o fim do dia no timezone da aplicação
 */
export const getEndOfDayInAppTimezone = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  const endOfDayZoned = endOfDay(zonedDate);
  return endOfDayZoned;
};

/**
 * Formata uma data para string ISO no timezone da aplicação
 */
export const formatToISOInAppTimezone = (date: Date) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

/**
 * Formata uma data para string 'yyyy-MM-dd' no timezone da aplicação
 */
export const formatDateInAppTimezone = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
};

/**
 * Verifica se uma data está dentro do dia atual no timezone da aplicação
 */
export const isTodayInAppTimezone = (dateString: string) => {
  try {
    const today = formatDateInAppTimezone();
    const dateToCheck = parseISO(dateString);
    const zonedDateToCheck = toZonedTime(dateToCheck, APP_TIMEZONE);
    const formattedDateToCheck = format(zonedDateToCheck, 'yyyy-MM-dd');
    return formattedDateToCheck === today;
  } catch (error) {
    console.error('[DATE_UTILS] Erro ao verificar se é hoje:', error);
    return false;
  }
};

/**
 * Converte timestamp de diferentes fontes para data padrão no timezone da aplicação
 */
export const normalizeTimestamp = (timestamp: string | Date | null | undefined) => {
  if (!timestamp) return null;
  
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    const zonedDate = toZonedTime(date, APP_TIMEZONE);
    return format(zonedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  } catch (error) {
    console.error('[DATE_UTILS] Erro ao normalizar timestamp:', error);
    return null;
  }
};

/**
 * Formata moeda Kz padrão (#.##0)
 */
export const formatKz = (value: number | string | null | undefined) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return '0 Kz';
  }
  
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
};

/**
 * Formata moeda Kz compacto (sem "Kz")
 */
export const formatKzCompact = (value: number | string | null | undefined) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return '0';
  }
  
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
};
