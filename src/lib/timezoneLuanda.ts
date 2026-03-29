import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// 🔑 TIMEZONE LUANDA - Fuso horário padrão da aplicação
export const APP_TIMEZONE = 'Africa/Luanda';

/**
 * Obtém o início do dia no timezone de Luanda (UTC+1)
 */
export const getStartOfDayInLuanda = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  const startOfDayZoned = startOfDay(zonedDate);
  return startOfDayZoned;
};

/**
 * Obtém o fim do dia no timezone de Luanda (UTC+1)
 */
export const getEndOfDayInLuanda = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  const endOfDayZoned = endOfDay(zonedDate);
  return endOfDayZoned;
};

/**
 * Converte qualquer data para o timezone de Luanda e retorna ISO string
 */
export const toLuandaISOString = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

/**
 * Formata data para string 'yyyy-MM-dd' no timezone de Luanda
 */
export const formatDateInLuanda = (date: Date = new Date()) => {
  const zonedDate = toZonedTime(date, APP_TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
};

/**
 * Verifica se uma data está dentro do dia atual no timezone de Luanda
 */
export const isTodayInLuanda = (dateString: string) => {
  try {
    const today = formatDateInLuanda();
    const dateToCheck = parseISO(dateString);
    const zonedDateToCheck = toZonedTime(dateToCheck, APP_TIMEZONE);
    const formattedDateToCheck = format(zonedDateToCheck, 'yyyy-MM-dd');
    return formattedDateToCheck === today;
  } catch (error) {
    console.error('[TIMEZONE_LUANDA] Erro ao verificar se é hoje:', error);
    return false;
  }
};

/**
 * Obtém o range de datas para "Hoje" em Luanda (UTC+1)
 * Retorna { start, end } com ISO strings para query Supabase
 */
export const getTodayRangeInLuanda = () => {
  const now = new Date();
  
  // Início do dia em Luanda (00:00) = 23:00 de ontem em UTC
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  start.setHours(start.getHours() - 1); // Meia-noite de Luanda

  // Fim do dia em Luanda (23:59) = 22:59 de hoje em UTC
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  end.setHours(end.getHours() - 1); // 23:59 de Luanda
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startLocal: toLuandaISOString(start),
    endLocal: toLuandaISOString(end),
    dateString: formatDateInLuanda(now)
  };
};

/**
 * Converte timestamp do Supabase para data local de Luanda
 */
export const supabaseTimestampToLuanda = (timestamp: string | Date | null | undefined) => {
  if (!timestamp) return null;
  
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
    const zonedDate = toZonedTime(date, APP_TIMEZONE);
    return format(zonedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  } catch (error) {
    console.error('[TIMEZONE_LUANDA] Erro ao converter timestamp:', error);
    return null;
  }
};

/**
 * Formata moeda Kwanza (AOA) para Angola
 */
export const formatKzAngola = (value: number | string | null | undefined) => {
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
 * Formata data no padrão DD/MM/AAAA para Angola
 */
export const formatDateDDMMAAAA = (date: Date | string | null | undefined) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const zonedDate = toZonedTime(dateObj, APP_TIMEZONE);
    return format(zonedDate, 'dd/MM/yyyy');
  } catch (error) {
    console.error('[TIMEZONE_LUANDA] Erro ao formatar data DD/MM/AAAA:', error);
    return '';
  }
};
