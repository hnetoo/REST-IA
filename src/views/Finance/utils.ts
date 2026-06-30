import { ExpenseCategory, ExpenseStatus } from '../../../types';

export const formatKz = (val: number | undefined | null) => {
  const safeVal = val?.toString()?.replace(/[^\d.-]/g, '') || "0";
  const numVal = parseFloat(safeVal) || 0;
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(numVal);
};

export const getCategoryColor = (category: ExpenseCategory) => {
  switch (category) {
    case 'ALIMENTACAO': return 'text-orange-500';
    case 'BEBIDAS': return 'text-blue-500';
    case 'MATERIAL_LIMPEZA': return 'text-green-500';
    case 'UTILIDADES': return 'text-yellow-500';
    case 'REPARACOES': return 'text-red-500';
    case 'MARKETING': return 'text-purple-500';
    default: return 'text-slate-500';
  }
};

export const getStatusColor = (status: ExpenseStatus) => {
  switch (status) {
    case 'PENDENTE': return 'text-yellow-500';
    case 'APROVADO': return 'text-blue-500';
    case 'PAGO': return 'text-green-500';
    default: return 'text-slate-500';
  }
};
