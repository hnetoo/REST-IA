/**
 * Serviço de Hash SHA-256 para conformidade AGT
 * Gera hashes criptográficos reais para validação de integridade de documentos fiscais
 */

/**
 * Gera hash SHA-256 de uma string usando Web Crypto API
 */
export const generateSHA256 = async (input: string): Promise<string> => {
  // Verificar se Web Crypto API está disponível
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  
  // Fallback para Node.js crypto
  try {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(input).digest('hex');
  } catch (error) {
    console.error('[HASH] Erro ao gerar hash SHA-256:', error);
    throw new Error('Não foi possível gerar hash SHA-256');
  }
};

/**
 * Gera hash de uma fatura conforme especificações AGT
 * Hash deve incluir: número fatura, data, NIF emitente, NIF cliente, total, itens
 */
export const generateInvoiceHash = async (
  invoiceNumber: string,
  invoiceDate: string,
  nifEmitente: string,
  nifCliente: string,
  total: number,
  items: any[] // Usar any[] para compatibilidade com diferentes formatos de OrderItem
): Promise<string> => {
  // Ordenar itens por dishId para garantir consistência
  const sortedItems = [...items].sort((a, b) => {
    const idA = a.dishId || a.dish_id || '';
    const idB = b.dishId || b.dish_id || '';
    return idA.localeCompare(idB);
  });
  
  // Criar string para hash
  const itemsString = sortedItems
    .map(item => {
      const id = item.dishId || item.dish_id || '';
      const qty = item.quantity || 0;
      const price = item.unitPrice || item.unit_price || 0;
      return `${id}|${qty}|${price.toFixed(2)}`;
    })
    .join('|');
  
  const hashString = `${invoiceNumber}|${invoiceDate}|${nifEmitente}|${nifCliente}|${total.toFixed(2)}|${itemsString}`;
  
  return await generateSHA256(hashString);
};

/**
 * Valida se um hash corresponde aos dados fornecidos
 */
export const validateInvoiceHash = async (
  hash: string,
  invoiceNumber: string,
  invoiceDate: string,
  nifEmitente: string,
  nifCliente: string,
  total: number,
  items: any[]
): Promise<boolean> => {
  const computedHash = await generateInvoiceHash(
    invoiceNumber,
    invoiceDate,
    nifEmitente,
    nifCliente,
    total,
    items
  );
  
  return computedHash === hash;
};

/**
 * Gera hash simplificado para validação rápida (sem itens)
 */
export const generateSimpleHash = async (
  invoiceNumber: string,
  invoiceDate: string,
  total: number
): Promise<string> => {
  const hashString = `${invoiceNumber}|${invoiceDate}|${total.toFixed(2)}`;
  return await generateSHA256(hashString);
};
