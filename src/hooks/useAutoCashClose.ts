import { useEffect, useRef } from 'react';
import { supabase } from '../supabase_standalone';

/**
 * 🤖 Hook de Fecho Automático de Caixa (Partilhado)
 * 
 * Executa em qualquer página onde o hook estiver montado (POS, OwnerDashboard, etc.)
 * Verifica a cada minuto se estamos na janela de fecho (04:55-04:59 Luanda)
 * e cria o registo de FECHO_CAIXA automaticamente se ainda não existir.
 * 
 * Isto garante que o fecho acontece mesmo que o POS não esteja aberto,
 * desde que qualquer página da app esteja ativa no browser.
 */
export const useAutoCashClose = () => {
  const hasClosedTodayRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAndAutoClose = async () => {
      try {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMin = now.getUTCMinutes();
        const currentHour = (utcHour + 1) % 24; // Luanda = UTC+1

        // Só executa entre 04:55 e 04:59 (janela de 5 min antes do novo dia)
        if (currentHour !== 4 || utcMin < 55) return;

        // Determinar o dia que está a acabar
        const luandaDate = new Date(now.getTime() + (1 * 60 * 60 * 1000));
        const closingDate = luandaDate.toISOString().split('T')[0];

        // Evitar múltiplas execuções para a mesma data
        if (hasClosedTodayRef.current === closingDate) return;

        // Verificar se já existe fecho
        const { data: existing } = await supabase
          .from('cash_flow')
          .select('id')
          .eq('category', 'FECHO_CAIXA')
          .eq('data_contabil', closingDate)
          .maybeSingle();

        if (existing) {
          hasClosedTodayRef.current = closingDate;
          return;
        }

        console.log('[FECHO AUTO] 🤖 Iniciando fecho automático para', closingDate);

        // Buscar vendas do dia
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, status')
          .eq('data_contabil', closingDate)
          .in('status', ['closed', 'paid']);

        const totalAmount = (orders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const ordersCount = orders?.length || 0;

        // Inserir fecho automático
        const { error: insertError } = await supabase
          .from('cash_flow')
          .insert({
            amount: totalAmount,
            category: 'FECHO_CAIXA',
            type: 'entrada',
            description: `Fecho Automático de Segurança - ${ordersCount} vendas`,
            data_contabil: closingDate,
            closed_by: 'Sistema (Auto-Fecho)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[FECHO AUTO] ❌ Erro ao inserir fecho automático:', insertError);
        } else {
          console.log('[FECHO AUTO] ✅ Fecho automático inserido:', totalAmount, 'Kz');
          hasClosedTodayRef.current = closingDate;
          // Tentar marcar dia como fechado
          try {
            await supabase.rpc('mark_day_closed_safe', { p_date: closingDate });
          } catch (e) {
            console.error('[FECHO AUTO] Erro ao marcar dia fechado:', e);
          }
        }
      } catch (err) {
        console.error('[FECHO AUTO] Erro geral:', err);
      }
    };

    // Verificar imediatamente ao montar (caso a página abra já na janela)
    checkAndAutoClose();

    // Verificar a cada minuto
    const interval = setInterval(checkAndAutoClose, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
