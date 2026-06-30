-- Migration: Fix Dashboard Luanda Timezone and Date Normalization
-- Description: Normalize timezone to Africa/Luanda and fix date formatting
-- Created: 2026-03-13 17:50:00

-- 1. Recriar função get_dashboard_metrics com timezone de Luanda e datas normalizadas
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_period TEXT DEFAULT 'HOJE',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSON;
  
  -- BLOCO A: DADOS GLOBAIS (independentes do período)
  v_historic_global DECIMAL(15,2) := (SELECT COALESCE(SUM(legacy_revenue_kz), 0) FROM public.business_stats);
  v_despesas_global DECIMAL(15,2) := (SELECT COALESCE(SUM(amount_kz), 0) FROM public.expenses WHERE category != 'staff');
  v_staff_global DECIMAL(15,2) := (SELECT COALESCE(SUM(amount_kz), 0) FROM public.expenses WHERE category = 'staff');
  
  -- BLOCO B: DADOS TEMPORAIS (dependem do período selecionado)
  v_vendas_hoje DECIMAL(15,2) := 0;
  v_vendas_periodo DECIMAL(15,2) := 0;
  v_orders_count INTEGER := 0;
  v_avg_ticket DECIMAL(15,2) := 0;
  v_tax_amount DECIMAL(15,2) := 0;
  
BEGIN
  -- Definir datas conforme período com timezone de Luanda
  v_end_date := COALESCE(p_end_date, (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date);
  
  IF p_start_date IS NOT NULL THEN
    v_start_date := p_start_date;
  ELSE
    CASE p_period
      WHEN 'HOJE' THEN v_start_date := (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date;
      WHEN 'SEMANA' THEN v_start_date := (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date - INTERVAL '7 days';
      WHEN 'MÊS' THEN v_start_date := (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date - INTERVAL '1 month';
      WHEN 'ANO' THEN v_start_date := (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date - INTERVAL '1 year';
      ELSE v_start_date := (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date;
    END CASE;
  END IF;
  
  -- Calcular dados temporais do período com datas normalizadas
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_vendas_periodo, v_orders_count
  FROM public.orders
  WHERE created_at::date >= v_start_date 
    AND created_at::date <= v_end_date
    AND status IN ('closed', 'paid');
  
  -- Calcular faturação de hoje com data normalizada
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_vendas_hoje
  FROM public.orders
  WHERE created_at::date = (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date
    AND status IN ('closed', 'paid');
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historic_global) * 0.065;
  
  -- Construir resultado JSON com valores NUMERIC(15,2)
  v_result := json_build_object(
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'metrics', json_build_object(
      'vendasHoje', v_vendas_hoje::NUMERIC(15,2),
      'totalVendas', v_vendas_periodo::NUMERIC(15,2),
      'historicoRevenue', v_historic_global::NUMERIC(15,2),
      'receitaTotal', (v_vendas_periodo + v_historic_global)::NUMERIC(15,2),
      'despesas', v_despesas_global::NUMERIC(15,2),
      'folhaSalarial', v_staff_global::NUMERIC(15,2),
      'impostos', v_tax_amount::NUMERIC(15,2),
      'mesasAtivas', 0,
      'ordersCount', v_orders_count,
      'ticketMedio', v_avg_ticket::NUMERIC(15,2),
      'lucroLiquido', ((v_vendas_periodo + v_historic_global) - v_despesas_global - v_staff_global - v_tax_amount)::NUMERIC(15,2)
    )
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
SELECT get_dashboard_metrics('HOJE') as test_result;
