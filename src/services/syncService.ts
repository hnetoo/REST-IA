import { supabase } from '../lib/supabase';

interface SyncPackage {
  today_revenue: number;
  global_revenue: number;
  staff_costs: number;
  total_expenses: number;
  open_orders_count: number;
}

// SINCRONIZAÇÃO DE DADOS - PACOTE COMPLETO
export const syncToTerminal = async (data: SyncPackage): Promise<boolean> => {
  try {
    console.log('[SYNC SERVICE] Enviando pacote completo para terminal_sync:', data);
    
    const { error } = await supabase
      .from('terminal_sync')
      .upsert({
        establishment_id: '00000000-0000-0000-0000-000000000001',
        last_sync: new Date().toISOString(),
        ...data
      }, {
        onConflict: 'establishment_id'
      });

    if (error) {
      console.error('[SYNC SERVICE] Erro ao sincronizar:', error);
      return false;
    }

    console.log('[SYNC SERVICE] Pacote sincronizado com sucesso');
    return true;
  } catch (err) {
    console.error('[SYNC SERVICE] Erro crítico na sincronização:', err);
    return false;
  }
};

export const getTerminalData = async (): Promise<SyncPackage | null> => {
  try {
    console.log('[SYNC SERVICE] Buscando dados da terminal_sync');
    
    const { data, error } = await supabase
      .from('terminal_sync')
      .select('*')
      .eq('establishment_id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error) {
      console.error('[SYNC SERVICE] Erro ao buscar dados:', error);
      return null;
    }

    console.log('[SYNC SERVICE] Pacote recebido:', data);
    return data;
  } catch (err) {
    console.error('[SYNC SERVICE] Erro crítico ao buscar dados:', err);
    return null;
  }
};
