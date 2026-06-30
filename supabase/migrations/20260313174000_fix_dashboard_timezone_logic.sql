-- Migration: Fix Dashboard Timezone and Key Names Logic
-- Description: Fix timezone issues and ensure proper key naming in get_dashboard_metrics
-- Created: 2026-03-13 17:40:00

-- 1. Recriar função get_dashboard_metrics com timezone e nomes corretos
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
  -- Definir datas conforme período com timezone de Angola
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
  
  -- Calcular dados temporais do período com timezone correto
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_vendas_periodo, v_orders_count
  FROM public.orders
  WHERE created_at >= v_start_date AT TIME ZONE 'Africa/Luanda'
    AND created_at <= (v_end_date + INTERVAL '1 day') AT TIME ZONE 'Africa/Luanda'
    AND status IN ('closed', 'paid');
  
  -- Calcular faturação de hoje com timezone correto
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_vendas_hoje
  FROM public.orders
  WHERE created_at::date = CURRENT_DATE
    AND status IN ('closed', 'paid');
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historic_global) * 0.065;
  
  -- Construir resultado JSON com nomes de chaves CORRETOS
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

-- 3. Verificar dados existentes no schema public
SELECT 'VERIFICAÇÃO DE DADOS NO SCHEMA PUBLIC:' as info;

-- 5. Testar função para garantir funcionamento
SELECT get_dashboard_metrics('HOJE') as test_result;
