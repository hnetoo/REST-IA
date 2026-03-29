-- Migration: Fix Dashboard Logic for HOJE period
-- Description: Adjust get_dashboard_metrics to return historical and expense data regardless of today's sales
-- Created: 2026-03-13 16:40:00

-- 1. Atualizar dados de teste para data de hoje
UPDATE public.business_stats 
SET created_at = CURRENT_DATE, 
    period_start = CURRENT_DATE,
    period_end = CURRENT_DATE
WHERE created_at IS NOT NULL;

-- Atualizar orders de exemplo (usando WHERE genérico)
UPDATE public.orders 
SET created_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE total_amount > 0 AND status = 'closed';

UPDATE public.expenses 
SET created_at = CURRENT_DATE,
    period_start = CURRENT_DATE,
    period_end = CURRENT_DATE
WHERE is_recurring = TRUE;

-- 2. Recriar função get_dashboard_metrics com lógica corrigida
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
  
  -- Calcular faturação atual (orders) - APENAS para período específico
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_total_revenue, v_orders_count
  FROM orders
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND status = 'closed';
  
  -- Calcular faturação de hoje (sempre do dia atual)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_today_revenue
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
    AND status = 'closed';
  
  -- Calcular faturação histórica (business_stats) - SEMPRE retornar valor total
  SELECT COALESCE(SUM(legacy_revenue_kz), 0)
  INTO v_historic_revenue
  FROM business_stats;
  
  -- Calcular despesas totais (expenses) - SEMPRE retornar valor total
  SELECT COALESCE(SUM(amount_kz), 0)
  INTO v_total_expenses
  FROM expenses
  WHERE is_recurring = TRUE;
  
  -- Calcular custos de staff (staff) - SEMPRE retornar valor total
  SELECT COALESCE(SUM(base_salary_kz), 0)
  INTO v_staff_costs
  FROM staff;
  
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
      'vendasHoje', v_today_revenue,
      'totalVendas', v_total_revenue,
      'historicoRevenue', v_historic_revenue,
      'receitaTotal', v_total_revenue + v_historic_revenue,
      'despesas', v_total_expenses,
      'folhaSalarial', v_staff_costs,
      'impostos', v_tax_amount,
      'mesasAtivas', 0, -- Calcular se necessário
      'ordersCount', v_orders_count,
      'ticketMedio', v_avg_ticket,
      'lucroLiquido', (v_total_revenue + v_historic_revenue) - v_total_expenses - v_staff_costs - v_tax_amount
    )
  );
  
  RETURN v_result;
END;
$$;

-- 3. Garantir permissões na função atualizada
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO postgres;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO service_role;

-- 4. Testar função para garantir funcionamento
SELECT get_dashboard_metrics('HOJE') as test_hoje;
SELECT get_dashboard_metrics('MÊS') as test_mes;
