-- Migration: Fix Vendas Hoje Complete - Timezone + Status + 24 Hours
-- Description: Complete fix for "Vendas Hoje" with 24-hour structure and flexible status
-- Created: 2026-03-13 19:20:00

-- 1. Atualizar função get_dashboard_metrics para fix completo
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_period TEXT DEFAULT 'HOJE',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSON;
  
  -- Variáveis independentes inicializadas com 0
  v_historico DECIMAL(15,2) := 0;
  v_despesas DECIMAL(15,2) := 0;
  v_staff DECIMAL(15,2) := 0;
  v_vendas_total DECIMAL(15,2) := 0;
  v_vendas_hoje DECIMAL(15,2) := 0;
  v_vendas_periodo DECIMAL(15,2) := 0;
  v_orders_count INTEGER := 0;
  v_avg_ticket DECIMAL(15,2) := 0;
  v_tax_amount DECIMAL(15,2) := 0;
  v_chart_data JSON := '[]'::JSON;
  
BEGIN
  -- Definir datas conforme período com timezone de Angola (WAT)
  v_end_date := COALESCE(p_end_date, CAST(timezone('Africa/Luanda', now()) AS DATE));
  
  IF p_start_date IS NOT NULL THEN
    v_start_date := p_start_date;
  ELSE
    CASE p_period
      WHEN 'HOJE' THEN v_start_date := CAST(timezone('Africa/Luanda', now()) AS DATE);
      WHEN 'SEMANA' THEN v_start_date := CAST(timezone('Africa/Luanda', now()) AS DATE) - INTERVAL '7 days';
      WHEN 'MÊS' THEN v_start_date := CAST(timezone('Africa/Luanda', now()) AS DATE) - INTERVAL '30 days';
      WHEN 'ANO' THEN v_start_date := CAST(timezone('Africa/Luanda', now()) AS DATE) - INTERVAL '365 days';
      ELSE v_start_date := CAST(timezone('Africa/Luanda', now()) AS DATE);
    END CASE;
  END IF;
  
  -- CÁLCULOS GLOBAIS (SELECTS SIMPLES - SEM AGREGAÇÃO ANINHADA)
  -- Histórico: SEMPRE somado, independente do período
  v_historico := (SELECT COALESCE(SUM(legacy_revenue_kz), 0) FROM public.business_stats);
  
  -- Despesas: SEMPRE somadas, independente do período
  v_despesas := (SELECT COALESCE(SUM(amount_kz), 0) FROM public.expenses WHERE category != 'staff');
  
  -- Staff: SEMPRE somado, independente do período
  v_staff := (SELECT COALESCE(SUM(amount_kz), 0) FROM public.expenses WHERE category = 'staff');
  
  -- Vendas Reais: TOTAL de todas as ordens fechadas/pagas
  v_vendas_total := (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders WHERE status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO'));
  
  -- CÁLCULOS TEMPORAIS (SELECTS SIMPLES)
  -- Vendas do período selecionado
  v_vendas_periodo := (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders WHERE created_at::date >= v_start_date AND created_at::date <= v_end_date AND status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO'));
  v_orders_count := (SELECT COUNT(*) FROM public.orders WHERE created_at::date >= v_start_date AND created_at::date <= v_end_date AND status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO'));
  
  -- Vendas de hoje (TIMEZONE PRECISO E TODOS OS STATUS) - FIX COMPLETO
  v_vendas_hoje := (SELECT COALESCE(SUM(total_amount), 0) 
    FROM public.orders 
    WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = (now() AT TIME ZONE 'Africa/Luanda')::date
      AND status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO')
  );
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historico) * 0.065;
  
  -- GERAR CHART DATA CONFORME PERÍODO (ESTRUTURA COMPLETA)
  IF p_period = 'HOJE' THEN
    -- HOJE: Criar 24 horas do dia (0h às 23h) - ESTRUTURA COMPLETA
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(hora, 'HH24:MI'),
          'total', COALESCE(hourly_total, 0),
          'orders', COALESCE(hourly_orders, 0)
        )
      )
      FROM (
        SELECT 
          h.hora,
          COALESCE(SUM(o.total_amount), 0) as hourly_total,
          COALESCE(COUNT(o.id), 0) as hourly_orders
        FROM (
          -- Gerar todas as 24 horas do dia
          SELECT generate_series(
            date_trunc('day', now() AT TIME ZONE 'Africa/Luanda'),
            date_trunc('day', now() AT TIME ZONE 'Africa/Luanda') + INTERVAL '23 hours',
            INTERVAL '1 hour'
          ) as hora
        ) h
        LEFT JOIN public.orders o ON (
          date_trunc('hour', o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda') = h.hora
          AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = (now() AT TIME ZONE 'Africa/Luanda')::date
          AND o.status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO')
        )
        GROUP BY h.hora
        ORDER BY h.hora
      ) as hourly_data
    );
    
  ELSIF p_period = 'SEMANA' THEN
    -- SEMANA: Agrupar vendas por dia (últimos 7 dias)
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(dia, 'YYYY-MM-DD'),
          'total', COALESCE(daily_total, 0),
          'orders', COALESCE(daily_orders, 0)
        )
      )
      FROM (
        SELECT 
          d.dia,
          COALESCE(SUM(o.total_amount), 0) as daily_total,
          COALESCE(COUNT(o.id), 0) as daily_orders
        FROM (
          -- Gerar todos os dias da semana
          SELECT generate_series(
            v_start_date,
            v_end_date,
            INTERVAL '1 day'
          )::date as dia
        ) d
        LEFT JOIN public.orders o ON (
          (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = d.dia
          AND o.status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO')
        )
        GROUP BY d.dia
        ORDER BY d.dia
      ) as daily_data
    );
    
  ELSIF p_period = 'MÊS' THEN
    -- MÊS: Agrupar vendas por dia (últimos 30 dias)
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(dia, 'YYYY-MM-DD'),
          'total', COALESCE(daily_total, 0),
          'orders', COALESCE(daily_orders, 0)
        )
      )
      FROM (
        SELECT 
          d.dia,
          COALESCE(SUM(o.total_amount), 0) as daily_total,
          COALESCE(COUNT(o.id), 0) as daily_orders
        FROM (
          -- Gerar todos os dias do mês
          SELECT generate_series(
            v_start_date,
            v_end_date,
            INTERVAL '1 day'
          )::date as dia
        ) d
        LEFT JOIN public.orders o ON (
          (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = d.dia
          AND o.status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO')
        )
        GROUP BY d.dia
        ORDER BY d.dia
      ) as daily_data
    );
    
  ELSIF p_period = 'ANO' THEN
    -- ANO: Agrupar vendas por mês (últimos 12 meses)
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(mes, 'YYYY-MM'),
          'total', COALESCE(monthly_total, 0),
          'orders', COALESCE(monthly_orders, 0)
        )
      )
      FROM (
        SELECT 
          m.mes,
          COALESCE(SUM(o.total_amount), 0) as monthly_total,
          COALESCE(COUNT(o.id), 0) as monthly_orders
        FROM (
          -- Gerar todos os meses do ano
          SELECT generate_series(
            date_trunc('month', v_start_date),
            date_trunc('month', v_end_date),
            INTERVAL '1 month'
          )::date as mes
        ) m
        LEFT JOIN public.orders o ON (
          date_trunc('month', o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = m.mes
          AND o.status IN ('closed', 'paid', 'completed', 'finalized', 'Finalizado', 'Pago', 'FECHADO')
        )
        GROUP BY m.mes
        ORDER BY m.mes
      ) as monthly_data
    );
  END IF;
  
  -- Construir resultado JSON com variáveis separadas
  v_result := json_build_object(
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'metrics', json_build_object(
      'vendasHoje', v_vendas_hoje::NUMERIC(15,2),
      'totalVendas', v_vendas_periodo::NUMERIC(15,2),
      'historicoRevenue', v_historico::NUMERIC(15,2),
      'receitaTotal', (v_vendas_periodo + v_historico)::NUMERIC(15,2),
      'despesas', v_despesas::NUMERIC(15,2),
      'folhaSalarial', v_staff::NUMERIC(15,2),
      'impostos', v_tax_amount::NUMERIC(15,2),
      'mesasAtivas', 0,
      'ordersCount', v_orders_count,
      'ticketMedio', v_avg_ticket::NUMERIC(15,2),
      'lucroLiquido', ((v_vendas_periodo + v_historico) - v_despesas - v_staff - v_tax_amount)::NUMERIC(15,2)
    ),
    'chartData', COALESCE(v_chart_data, '[]'::JSON)
  );
  
  RETURN v_result;
END;
$$;

-- 2. Garantir permissões na função atualizada
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO postgres;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO service_role;

-- 3. Teste de auditoria para verificar dados reais
-- SELECT id, total_amount, created_at, status FROM orders ORDER BY created_at DESC LIMIT 1;
