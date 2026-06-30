-- Migration: Fix Vendas Hoje Status - Update Order Status Check
-- Description: Update get_dashboard_metrics to check for 'completed' status in addition to 'closed'/'paid'
-- Created: 2026-03-13 18:45:00

-- 1. Atualizar função get_dashboard_metrics para incluir status 'completed'
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
  
  -- CÁLCULOS GLOBAIS (SEM FILTROS DE DATA - FORÇA EXPLÍCITA)
  -- Histórico: SEMPRE somado, independente do período
  SELECT COALESCE(SUM(legacy_revenue_kz), 0) INTO v_historico FROM public.business_stats;
  
  -- Despesas: SEMPRE somadas, independente do período
  SELECT COALESCE(SUM(amount_kz), 0) INTO v_despesas FROM public.expenses WHERE category != 'staff';
  
  -- Staff: SEMPRE somado, independente do período
  SELECT COALESCE(SUM(amount_kz), 0) INTO v_staff FROM public.expenses WHERE category = 'staff';
  
  -- Vendas Reais: TOTAL de todas as ordens fechadas/pagas
  SELECT COALESCE(SUM(total_amount), 0) INTO v_vendas_total FROM public.orders WHERE status IN ('closed', 'paid', 'completed');
  
  -- CÁLCULOS TEMPORAIS (COM FILTROS DE DATA)
  -- Vendas do período selecionado
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_vendas_periodo, v_orders_count
  FROM public.orders
  WHERE created_at::date >= v_start_date 
    AND created_at::date <= v_end_date
    AND status IN ('closed', 'paid', 'completed');
  
  -- Vendas de hoje (apenas do dia atual em Angola) - ATUALIZADO COM STATUS 'completed'
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_vendas_hoje
  FROM public.orders
  WHERE created_at::date = CAST(timezone('Africa/Luanda', now()) AS DATE)
    AND status IN ('closed', 'paid', 'completed');
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historico) * 0.065;
  
  -- GERAR CHART DATA CONFORME PERÍODO
  IF p_period = 'SEMANA' THEN
    -- Agrupar vendas por dia (últimos 7 dias)
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(dia, 'YYYY-MM-DD'),
          'total', COALESCE(SUM(total_amount), 0),
          'orders', COUNT(*)
        )
      )
      FROM (
        SELECT created_at::date as dia, total_amount
          FROM public.orders
          WHERE created_at::date >= v_start_date 
            AND created_at::date <= v_end_date
            AND status IN ('closed', 'paid', 'completed')
          ORDER BY dia
      ) as vendas_diarias
      GROUP BY dia
    );
    
  ELSIF p_period = 'MÊS' THEN
    -- Agrupar vendas por dia (últimos 30 dias)
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(dia, 'YYYY-MM-DD'),
          'total', COALESCE(SUM(total_amount), 0),
          'orders', COUNT(*)
        )
      )
      FROM (
        SELECT created_at::date as dia, total_amount
          FROM public.orders
          WHERE created_at::date >= v_start_date 
            AND created_at::date <= v_end_date
            AND status IN ('closed', 'paid', 'completed')
          ORDER BY dia
      ) as vendas_diarias
      GROUP BY dia
    );
    
  ELSIF p_period = 'ANO' THEN
    -- Agrupar vendas por mês (últimos 12 meses)
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(mes, 'YYYY-MM'),
          'total', COALESCE(SUM(total_amount), 0),
          'orders', COUNT(*)
        )
      )
      FROM (
        SELECT date_trunc('month', created_at)::date as mes, total_amount
          FROM public.orders
          WHERE created_at::date >= v_start_date 
            AND created_at::date <= v_end_date
            AND status IN ('closed', 'paid', 'completed')
          ORDER BY mes
      ) as vendas_mensais
      GROUP BY mes
    );
    
  ELSE
    -- HOJE: Agrupar por hora do dia
    v_chart_data := (
      SELECT json_agg(
        json_build_object(
          'date', to_char(hora, 'YYYY-MM-DD HH24:MI'),
          'total', COALESCE(SUM(total_amount), 0),
          'orders', COUNT(*)
        )
      )
      FROM (
        SELECT date_trunc('hour', created_at) as hora, total_amount
          FROM public.orders
          WHERE created_at::date = CAST(timezone('Africa/Luanda', now()) AS DATE)
            AND status IN ('closed', 'paid', 'completed')
          ORDER BY hora
      ) as vendas_horarias
      GROUP BY hora
    );
  END IF;
  
  -- Construir resultado JSON com chartData
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

-- 3. Testar função para garantir funcionamento
-- SELECT get_dashboard_metrics('HOJE') as test_result;
