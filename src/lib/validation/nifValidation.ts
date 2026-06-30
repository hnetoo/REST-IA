/**
 * Serviço de Validação de NIF para conformidade AGT Angola
 * Valida NIFs conforme as especificações da Autoridade Geral Tributária
 */

/**
 * Valida formato de NIF (9 dígitos)
 */
export const validateNIFFormat = (nif: string): boolean => {
  // Consumidor final
  if (nif === '999999999') return true;
  
  // Formato: 9 dígitos
  if (!/^\d{9}$/.test(nif)) return false;
  
  return true;
};

/**
 * Valida checksum do NIF angolano (algoritmo AGT)
 * Algoritmo baseado em módulo 11
 */
export const validateNIFChecksum = (nif: string): boolean => {
  // Consumidor final
  if (nif === '999999999') return true;
  
  // Verificar formato primeiro
  if (!validateNIFFormat(nif)) return false;
  
  const digits = nif.split('').map(Number);
  
  // Algoritmo de validação angolano
  // Multiplicar cada dígito pelo peso correspondente (9,8,7,6,5,4,3,2)
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return checkDigit === digits[8];
};

/**
 * Valida NIF completo (formato + checksum)
 */
export const validateNIF = (nif: string): boolean => {
  if (!nif) return false;
  
  // Remover espaços e caracteres especiais
  const cleanedNif = nif.replace(/[\s\-]/g, '');
  
  // Validar formato
  if (!validateNIFFormat(cleanedNif)) return false;
  
  // Validar checksum
  if (!validateNIFChecksum(cleanedNif)) return false;
  
  return true;
};

/**
 * Formata NIF para exibição (### ### ###)
 */
export const formatNIF = (nif: string): string => {
  if (!nif) return '';
  
  const cleanedNif = nif.replace(/[\s\-]/g, '');
  
  if (cleanedNif.length !== 9) return cleanedNif;
  
  return `${cleanedNif.slice(0, 3)} ${cleanedNif.slice(3, 6)} ${cleanedNif.slice(6)}`;
};

/**
 * Retorna mensagem de erro de validação
 */
export const getNIFValidationError = (nif: string): string | null => {
  if (!nif) return 'NIF é obrigatório';
  
  const cleanedNif = nif.replace(/[\s\-]/g, '');
  
  if (!/^\d{9}$/.test(cleanedNif)) {
    return 'NIF deve ter 9 dígitos';
  }
  
  if (!validateNIFChecksum(cleanedNif)) {
    return 'NIF inválido (checksum incorreto)';
  }
  
  return null;
};

/**
 * Verifica se é consumidor final
 */
export const isConsumerFinal = (nif: string): boolean => {
  const cleanedNif = nif.replace(/[\s\-]/g, '');
  return cleanedNif === '999999999';
};
