-- Migration: Fix Dashboard Global Logic - Separate Period and Global Data
-- Description: Rewrite get_dashboard_metrics to separate period-specific from global data
-- Created: 2026-03-13 17:20:00

-- 1. Recriar função get_dashboard_metrics com lógica correta
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
  v_vendas_periodo DECIMAL(15,2) := 0;
  v_vendas_hoje DECIMAL(15,2) := 0;
  v_historic_global DECIMAL(15,2) := 0;
  v_despesas_global DECIMAL(15,2) := 0;
  v_staff_global DECIMAL(15,2) := 0;
  v_tax_amount DECIMAL(15,2) := 0;
  v_orders_count INTEGER := 0;
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
  
  -- 1. VENDAS DO PERÍODO (depende da data)
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_vendas_periodo, v_orders_count
  FROM public.orders
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND status IN ('closed', 'paid');
  
  -- 2. VENDAS DE HOJE (apenas do dia atual)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_vendas_hoje
  FROM public.orders
  WHERE DATE(created_at) = CURRENT_DATE
    AND status IN ('closed', 'paid');
  
  -- 3. HISTÓRICO GLOBAL (independente do período - SEMPRE)
  SELECT COALESCE(SUM(legacy_revenue_kz), 0)
  INTO v_historic_global
  FROM public.business_stats;
  
  -- 4. DESPESAS GLOBAIS (independente do período - SEMPRE)
  SELECT COALESCE(SUM(amount_kz), 0)
  INTO v_despesas_global
  FROM public.expenses
  WHERE category != 'staff';
  
  -- 5. STAFF GLOBAL (independente do período - SEMPRE)
  SELECT COALESCE(SUM(amount_kz), 0)
  INTO v_staff_global
  FROM public.expenses
  WHERE category = 'staff';
  
  -- 6. Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historic_global) * 0.065;
  
  -- 7. Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- 8. Construir resultado JSON
  v_result := json_build_object(
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'metrics', json_build_object(
      'vendasHoje', COALESCE(v_vendas_hoje, 0),
      'totalVendas', COALESCE(v_vendas_periodo, 0),
      'historicoRevenue', COALESCE(v_historic_global, 0),
      'receitaTotal', COALESCE(v_vendas_periodo + v_historic_global, 0),
      'despesas', COALESCE(v_despesas_global, 0),
      'folhaSalarial', COALESCE(v_staff_global, 0),
      'impostos', COALESCE(v_tax_amount, 0),
      'mesasAtivas', 0,
      'ordersCount', COALESCE(v_orders_count, 0),
      'ticketMedio', COALESCE(v_avg_ticket, 0),
      'lucroLiquido', COALESCE((v_vendas_periodo + v_historic_global) - v_despesas_global - v_staff_global - v_tax_amount, 0)
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

-- 3. Verificar dados existentes para debugging
SELECT 'VERIFICAÇÃO DE DADOS EXISTENTES:' as info;
SELECT 
  'business_stats' as tabela, 
  COUNT(*) as total_registros,
  COALESCE(SUM(legacy_revenue_kz), 0) as soma_total
FROM public.business_stats
UNION ALL
SELECT 
  'expenses' as tabela, 
  COUNT(*) as total_registros,
  COALESCE(SUM(amount_kz), 0) as soma_total
FROM public.expenses
UNION ALL
SELECT 
  'orders' as tabela, 
  COUNT(*) as total_registros,
  COALESCE(SUM(total_amount), 0) as soma_total
FROM public.orders
WHERE status IN ('closed', 'paid');

-- 4. Testar função para garantir funcionamento
SELECT get_dashboard_metrics('HOJE') as test_result;
