/**
 * Serviço de Gestão de Séries de Faturação AGT
 * Cria, lista e mantém séries autorizadas para emissão de documentos fiscais
 */

import { supabase } from '../../supabase_standalone';

import type { AGTSeries, AGTDocumentType, AGTSeriesStatus } from '../../types/agt';

/**
 * Cria uma nova série de faturação no Supabase
 */
export async function createAGTSeries(
  seriesCode: string,
  documentType: AGTDocumentType,
  year: number,
  authorizedQuantity: number,
  establishmentNumber: string = '001'
): Promise<{ success: boolean; series?: AGTSeries; message?: string }> {
  try {
    const firstNo = `${documentType} ${seriesCode}/000001`;
    const lastNo = `${documentType} ${seriesCode}/${String(authorizedQuantity).padStart(6, '0')}`;

    const { data, error } = await supabase
      .from('agt_series')
      .insert({
        series_code: seriesCode,
        series_year: year,
        document_type: documentType,
        establishment_number: establishmentNumber,
        authorized_quantity: authorizedQuantity,
        first_document_no: firstNo,
        last_document_no: lastNo,
        current_sequence: 0,
        status: 'A'
      })
      .select()
      .single();

    if (error) throw error;

    const series: AGTSeries = {
      id: data.id,
      seriesCode: data.series_code,
      seriesYear: data.series_year,
      documentType: data.document_type,
      establishmentNumber: data.establishment_number || '001',
      authorizedQuantity: data.authorized_quantity,
      firstDocumentNo: data.first_document_no,
      lastDocumentNo: data.last_document_no,
      currentSequence: data.current_sequence || 0,
      status: (data.status as AGTSeriesStatus) || 'A',
      agtRegistrationCode: data.agt_registration_code,
      agtRegisteredAt: data.agt_registered_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    return { success: true, series };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar série';
    return { success: false, message: msg };
  }
}

/**
 * Inicializa séries padrão para o estabelecimento se não existirem
 */
export async function initializeDefaultSeries(
  year: number = new Date().getFullYear()
): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se já existe série FR para o ano
    const { data: existing } = await supabase
      .from('agt_series')
      .select('id')
      .eq('document_type', 'FR')
      .eq('series_year', year)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, message: 'Séries já inicializadas' };
    }

    // Criar série FR (Fatura-Recibo) - mais comum em restauração
    const frResult = await createAGTSeries('A', 'FR', year, 10000, '001');
    if (!frResult.success) {
      return { success: false, message: `Erro ao criar série FR: ${frResult.message}` };
    }

    // Criar série FT (Fatura)
    const ftResult = await createAGTSeries('B', 'FT', year, 10000, '001');
    if (!ftResult.success) {
      return { success: false, message: `Erro ao criar série FT: ${ftResult.message}` };
    }

    // Criar série NC (Nota de Crédito)
    const ncResult = await createAGTSeries('C', 'NC', year, 5000, '001');
    if (!ncResult.success) {
      return { success: false, message: `Erro ao criar série NC: ${ncResult.message}` };
    }

    // Criar série TV (Talão de Venda)
    const tvResult = await createAGTSeries('D', 'TV', year, 5000, '001');
    if (!tvResult.success) {
      return { success: false, message: `Erro ao criar série TV: ${tvResult.message}` };
    }

    // Criar série ND (Nota de Débito)
    const ndResult = await createAGTSeries('E', 'ND', year, 5000, '001');
    if (!ndResult.success) {
      return { success: false, message: `Erro ao criar série ND: ${ndResult.message}` };
    }

    // Criar série RG (Recibo)
    const rgResult = await createAGTSeries('F', 'RG', year, 5000, '001');
    if (!rgResult.success) {
      return { success: false, message: `Erro ao criar série RG: ${rgResult.message}` };
    }

    return { success: true, message: 'Séries AGT inicializadas com sucesso' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao inicializar séries';
    return { success: false, message: msg };
  }
}

/**
 * Lista todas as séries ativas
 */
export async function listActiveSeries(): Promise<AGTSeries[]> {
  try {
    const { data, error } = await supabase
      .from('agt_series')
      .select('*')
      .eq('status', 'A')
      .order('series_year', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      seriesCode: row.series_code,
      seriesYear: row.series_year,
      documentType: row.document_type,
      establishmentNumber: row.establishment_number || '001',
      authorizedQuantity: row.authorized_quantity,
      firstDocumentNo: row.first_document_no,
      lastDocumentNo: row.last_document_no,
      currentSequence: row.current_sequence || 0,
      status: (row.status as AGTSeriesStatus) || 'A',
      agtRegistrationCode: row.agt_registration_code,
      agtRegisteredAt: row.agt_registered_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.error('[AGT Series] Erro ao listar séries:', err);
    return [];
  }
}

/**
 * Busca série por tipo e ano
 */
export async function getSeriesByType(
  documentType: AGTDocumentType,
  year: number = new Date().getFullYear()
): Promise<AGTSeries | null> {
  try {
    const { data, error } = await supabase
      .from('agt_series')
      .select('*')
      .eq('document_type', documentType)
      .eq('series_year', year)
      .eq('status', 'A')
      .order('series_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      seriesCode: data.series_code,
      seriesYear: data.series_year,
      documentType: data.document_type,
      establishmentNumber: data.establishment_number || '001',
      authorizedQuantity: data.authorized_quantity,
      firstDocumentNo: data.first_document_no,
      lastDocumentNo: data.last_document_no,
      currentSequence: data.current_sequence || 0,
      status: (data.status as AGTSeriesStatus) || 'A',
      agtRegistrationCode: data.agt_registration_code,
      agtRegisteredAt: data.agt_registered_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[AGT Series] Erro ao buscar série:', err);
    return null;
  }
}
