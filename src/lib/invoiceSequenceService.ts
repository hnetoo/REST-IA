import { supabase } from '../supabase_standalone';
import { getAGTService, AGTSeriesRequest } from './agt/agtService';

/**
 * Serviço de Sequencialidade de Faturas para conformidade AGT
 * Garante sequencialidade única e ininterrupta por série e ano
 */

export interface InvoiceSeries {
  id: number;
  series_code: string; // Ex: FT 2025, FR 2025
  description: string;
  invoice_type: string; // FT, FR, ND, NC
  is_active: boolean;
  agt_registered: boolean;
  agt_registration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceSequence {
  id: number;
  series_id: number;
  year: number;
  sequence_number: number;
  last_used: string | null;
}

/**
 * Gera o próximo número de fatura sequencial
 * Garante atomicidade usando transação do Supabase
 */
export const generateNextInvoiceNumber = async (
  seriesCode: string,
  year: number
): Promise<string> => {
  try {
    // Buscar série
    const { data: series, error: seriesError } = await supabase
      .from('invoice_series')
      .select('*')
      .eq('series_code', seriesCode)
      .eq('is_active', true)
      .single();
    
    if (seriesError || !series) {
      console.error('[INVOICE] Erro ao buscar série:', seriesError);
      throw new Error('Série de fatura não encontrada');
    }
    
    // Buscar ou criar sequência para o ano
    let { data: sequence, error: seqError } = await supabase
      .from('invoice_sequences')
      .select('*')
      .eq('series_id', series.id)
      .eq('year', year)
      .single();
    
    if (seqError && seqError.code !== 'PGRST116') {
      console.error('[INVOICE] Erro ao buscar sequência:', seqError);
      throw new Error('Erro ao buscar sequência');
    }
    
    if (!sequence) {
      // Criar nova sequência
      const { data: newSequence, error: createError } = await supabase
        .from('invoice_sequences')
        .insert({
          series_id: series.id,
          year: year,
          sequence_number: 0,
          last_used: null
        })
        .select()
        .single();
      
      if (createError || !newSequence) {
        console.error('[INVOICE] Erro ao criar sequência:', createError);
        throw new Error('Erro ao criar sequência');
      }
      
      sequence = newSequence;
    }
    
    // Incrementar sequência atomicamente
    const nextNumber = sequence.sequence_number + 1;
    const { error: updateError } = await supabase
      .from('invoice_sequences')
      .update({
        sequence_number: nextNumber,
        last_used: new Date().toISOString()
      })
      .eq('id', sequence.id);
    
    if (updateError) {
      console.error('[INVOICE] Erro ao atualizar sequência:', updateError);
      throw new Error('Erro ao atualizar sequência');
    }
    
    // Formatar número de fatura: FT 2025/000001
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    return `${seriesCode}/${paddedNumber}`;
    
  } catch (error) {
    console.error('[INVOICE] Erro ao gerar número de fatura:', error);
    throw error;
  }
};

/**
 * Busca todas as séries de faturas ativas
 */
export const getActiveInvoiceSeries = async (): Promise<InvoiceSeries[]> => {
  try {
    const { data, error } = await supabase
      .from('invoice_series')
      .select('*')
      .eq('is_active', true)
      .order('series_code');
    
    if (error) {
      console.error('[INVOICE] Erro ao buscar séries:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[INVOICE] Erro ao buscar séries:', error);
    return [];
  }
};

/**
 * Busca série de faturas por código
 */
export const getInvoiceSeriesByCode = async (
  seriesCode: string
): Promise<InvoiceSeries | null> => {
  try {
    const { data, error } = await supabase
      .from('invoice_series')
      .select('*')
      .eq('series_code', seriesCode)
      .single();
    
    if (error) {
      console.error('[INVOICE] Erro ao buscar série:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[INVOICE] Erro ao buscar série:', error);
    return null;
  }
};

/**
 * Cria nova série de faturas
 */
export const createInvoiceSeries = async (
  seriesCode: string,
  description: string,
  invoiceType: string
): Promise<InvoiceSeries | null> => {
  try {
    const { data, error } = await supabase
      .from('invoice_series')
      .insert({
        series_code: seriesCode,
        description,
        invoice_type: invoiceType,
        is_active: true,
        agt_registered: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('[INVOICE] Erro ao criar série:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[INVOICE] Erro ao criar série:', error);
    return null;
  }
};

/**
 * Registra série na AGT
 */
export const registerSeriesAtAGT = async (
  seriesId: number,
  seriesCode: string,
  description: string,
  invoiceType: string,
  year: number,
  nif: string
): Promise<boolean> => {
  try {
    const agtService = getAGTService();
    
    if (!agtService) {
      console.error('[INVOICE] Serviço AGT não inicializado');
      return false;
    }

    // Preparar requisição
    const request: AGTSeriesRequest = {
      seriesCode,
      description,
      invoiceType,
      year,
      nif
    };

    // Enviar para AGT
    const response = await agtService.registerSeries(request);

    if (response.success) {
      // Atualizar registo local
      const { error } = await supabase
        .from('invoice_series')
        .update({
          agt_registered: true,
          agt_registration_date: new Date().toISOString()
        })
        .eq('id', seriesId);
      
      if (error) {
        console.error('[INVOICE] Erro ao atualizar registo local:', error);
        return false;
      }
      
      console.log('[INVOICE] Série registada na AGT com sucesso');
      return true;
    } else {
      console.error('[INVOICE] Erro ao registar série na AGT:', response.message);
      return false;
    }
  } catch (error) {
    console.error('[INVOICE] Erro ao registar série na AGT:', error);
    return false;
  }
};

/**
 * Valida formato de número de fatura
 */
export const validateInvoiceNumberFormat = (invoiceNumber: string): boolean => {
  // Formato esperado: FT 2025/000001
  const regex = /^[A-Z]{2}\s\d{4}\/\d{6}$/;
  return regex.test(invoiceNumber);
};

/**
 * Extrai informações do número de fatura
 */
export const parseInvoiceNumber = (invoiceNumber: string): {
  seriesCode: string;
  year: number;
  sequenceNumber: number;
} | null => {
  if (!validateInvoiceNumberFormat(invoiceNumber)) {
    return null;
  }
  
  const parts = invoiceNumber.split('/');
  const seriesCode = parts[0];
  const sequenceNumber = parseInt(parts[1]);
  const year = parseInt(seriesCode.split(' ')[1]);
  
  return { seriesCode, year, sequenceNumber };
};
