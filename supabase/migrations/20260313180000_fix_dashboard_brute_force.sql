-- Migration: Fix Dashboard Brute Force - Public Schema and Coalesce
-- Description: Use public.table_name and remove all filters from global data
-- Created: 2026-03-13 18:00:00

-- 1. Recriar função get_dashboard_metrics com força bruta
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
  
  -- Inicializar todas as variáveis com 0 para evitar NULL
  v_historic_global DECIMAL(15,2) := 0;
  v_despesas_global DECIMAL(15,2) := 0;
  v_staff_global DECIMAL(15,2) := 0;
  v_vendas_hoje DECIMAL(15,2) := 0;
  v_vendas_periodo DECIMAL(15,2) := 0;
  v_orders_count INTEGER := 0;
  v_avg_ticket DECIMAL(15,2) := 0;
  v_tax_amount DECIMAL(15,2) := 0;
  
BEGIN
  -- Definir datas conforme período com timezone de Angola
  v_end_date := COALESCE(p_end_date, timezone('Africa/Luanda', now())::date);
  
  IF p_start_date IS NOT NULL THEN
    v_start_date := p_start_date;
  ELSE
    CASE p_period
      WHEN 'HOJE' THEN v_start_date := timezone('Africa/Luanda', now())::date;
      WHEN 'SEMANA' THEN v_start_date := timezone('Africa/Luanda', now())::date - INTERVAL '7 days';
      WHEN 'MÊS' THEN v_start_date := timezone('Africa/Luanda', now())::date - INTERVAL '1 month';
      WHEN 'ANO' THEN v_start_date := timezone('Africa/Luanda', now())::date - INTERVAL '1 year';
      ELSE v_start_date := timezone('Africa/Luanda', now())::date;
    END CASE;
  END IF;
  
  -- BLOCO A: DADOS GLOBAIS (SEM FILTRO DE DATA - FORÇA BRUTA)
  SELECT COALESCE(SUM(legacy_revenue_kz), 0) INTO v_historic_global FROM public.business_stats;
  SELECT COALESCE(SUM(amount_kz), 0) INTO v_despesas_global FROM public.expenses WHERE category != 'staff';
  SELECT COALESCE(SUM(amount_kz), 0) INTO v_staff_global FROM public.expenses WHERE category = 'staff';
  
  -- BLOCO B: DADOS TEMPORAIS (COM FILTRO DE DATA)
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_vendas_periodo, v_orders_count
  FROM public.orders
  WHERE created_at::date >= v_start_date 
    AND created_at::date <= v_end_date
    AND status IN ('closed', 'paid');
  
  -- Calcular faturação de hoje com timezone de Angola
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_vendas_hoje
  FROM public.orders
  WHERE created_at::date = timezone('Africa/Luanda', now())::date
    AND status IN ('closed', 'paid');
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historic_global) * 0.065;
  
  -- Construir resultado JSON com força bruta
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

-- 3. TESTE DE FORÇA BRUTA - Verificar dados existentes
SELECT 'TESTE DE FORÇA BRUTA - DADOS EXISTENTES:' as info;
SELECT COALESCE(SUM(amount_kz), 0) as soma_expenses FROM public.expenses;
SELECT COALESCE(SUM(legacy_revenue_kz), 0) as soma_business_stats FROM public.business_stats;
SELECT COALESCE(SUM(total_amount), 0) as soma_orders FROM public.orders WHERE status IN ('closed', 'paid');

-- 4. Testar função para garantir funcionamento
SELECT get_dashboard_metrics('HOJE') as test_result;
