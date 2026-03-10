import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Função de override para debug (mantida para compatibilidade)
const getRuntimeOverride = () => {
  let url = '';
  let key = '';
  try {
    // Read from search
    let params = new URLSearchParams(window.location.search || '');
    url = params.get('supabaseUrl') || '';
    key = params.get('anonKey') || '';

    // Fallback: read from hash query (HashRouter scenario)
    if ((!url || !key) && typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex >= 0) {
        const hashQuery = hash.substring(qIndex + 1);
        const hparams = new URLSearchParams(hashQuery);
        url = url || hparams.get('supabaseUrl') || '';
        key = key || hparams.get('anonKey') || '';
      }
    }
    const lsUrl = localStorage.getItem('VITE_SUPABASE_URL') || '';
    const lsKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '';
    if (!url && lsUrl) url = lsUrl;
    if (!key && lsKey) key = lsKey;
  } catch {}
  return { url, key };
};

// Exportar o cliente centralizado (sem criar nova instância)
export { supabase };

// Manter getClient para compatibilidade, mas retornar o cliente centralizado
export const getClient = () => {
  return supabase;
};

const ensureSupabaseConfigured = () => {
  const { url, key } = getRuntimeOverride();
  if (!(url || envUrl) || !(key || envAnonKey)) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ou use ?supabaseUrl=...&anonKey=....');
  }
};

export const getSupabaseMenu = async () => {
  ensureSupabaseConfigured();
  const client = getClient();
  const { data, error } = await client
    .from('dishes')
    .select('*');
  if (error) throw error;
  return data;
};

export const getSupabaseCategories = async () => {
  ensureSupabaseConfigured();
  const client = getClient();
  const { data, error } = await client
    .from('categories')
    .select('*');
  if (error) throw error;
  return data;
};

export const getSupabaseOrders = async () => {
  ensureSupabaseConfigured();
  const client = getClient();
  const { data, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
