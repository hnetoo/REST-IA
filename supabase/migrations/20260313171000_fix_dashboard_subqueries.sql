-- Migration: Fix Dashboard with Sub-Queries
-- Description: Rewrite get_dashboard_metrics using independent sub-queries with COALESCE
-- Created: 2026-03-13 17:10:00

-- 1. Recriar função get_dashboard_metrics com sub-queries independentes
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
  v_total_revenue DECIMAL(15,2) := 0;
  v_historic_revenue DECIMAL(15,2) := 0;
  v_total_expenses DECIMAL(15,2) := 0;
  v_staff_costs DECIMAL(15,2) := 0;
  v_tax_amount DECIMAL(15,2) := 0;
  v_orders_count INTEGER := 0;
  v_today_revenue DECIMAL(15,2) := 0;
  v_avg_ticket DECIMAL(15,2) := 0;
BEGIN
  -- Definir datas conforme período
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  IF p_start_date IS NOT NULL THEN
    v_start_date := p_start_date;
  ELSE
    CASE p_period
      WHEN 'HOJE' THEN v_start_date := CURRENT_DATE;
      WHEN 'SEMANA' THEN v_start_date := CURRENT_DATE - INTERVAL '7 days';
      WHEN 'MÊS' THEN v_start_date := CURRENT_DATE - INTERVAL '1 month';
      WHEN 'ANO' THEN v_start_date := CURRENT_DATE - INTERVAL '1 year';
      ELSE v_start_date := CURRENT_DATE;
    END CASE;
  END IF;
  
  -- Sub-queries independentes com COALESCE para evitar NULL
  v_historic_revenue := (SELECT COALESCE(SUM(legacy_revenue_kz), 0) FROM public.business_stats);
  v_total_expenses := (SELECT COALESCE(SUM(amount_kz), 0) FROM public.expenses WHERE category != 'staff');
  v_staff_costs := (SELECT COALESCE(SUM(amount_kz), 0) FROM public.expenses WHERE category = 'staff');
  
  -- Calcular faturação total e hoje
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_total_revenue, v_orders_count
  FROM public.orders
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND status IN ('closed', 'paid');
  
  -- Calcular faturação de hoje
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_today_revenue
  FROM public.orders
  WHERE DATE(created_at) = CURRENT_DATE
    AND status IN ('closed', 'paid');
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_total_revenue + v_historic_revenue) * 0.065;
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_total_revenue / v_orders_count;
  END IF;
  
  -- Construir resultado JSON
  v_result := json_build_object(
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'metrics', json_build_object(
      'vendasHoje', COALESCE(v_today_revenue, 0),
      'totalVendas', COALESCE(v_total_revenue, 0),
      'historicoRevenue', COALESCE(v_historic_revenue, 0),
      'receitaTotal', COALESCE(v_total_revenue + v_historic_revenue, 0),
      'despesas', COALESCE(v_total_expenses, 0),
      'folhaSalarial', COALESCE(v_staff_costs, 0),
      'impostos', COALESCE(v_tax_amount, 0),
      'mesasAtivas', 0,
      'ordersCount', COALESCE(v_orders_count, 0),
      'ticketMedio', COALESCE(v_avg_ticket, 0),
      'lucroLiquido', COALESCE((v_total_revenue + v_historic_revenue) - v_total_expenses - v_staff_costs - v_tax_amount, 0)
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
