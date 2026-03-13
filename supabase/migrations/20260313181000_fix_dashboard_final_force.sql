-- Migration: Fix Dashboard Final Force - Explicit Schema and Independent Variables
-- Description: Force explicit public schema and remove date filters from global data
-- Created: 2026-03-13 18:10:00

-- 1. Recriar função get_dashboard_metrics com força explícita
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
  
BEGIN
  -- Definir datas conforme período com timezone de Angola
  v_end_date := COALESCE(p_end_date, (now() AT TIME ZONE 'Africa/Luanda')::date);
  
  IF p_start_date IS NOT NULL THEN
    v_start_date := p_start_date;
  ELSE
    CASE p_period
      WHEN 'HOJE' THEN v_start_date := (now() AT TIME ZONE 'Africa/Luanda')::date;
      WHEN 'SEMANA' THEN v_start_date := (now() AT TIME ZONE 'Africa/Luanda')::date - INTERVAL '7 days';
      WHEN 'MÊS' THEN v_start_date := (now() AT TIME ZONE 'Africa/Luanda')::date - INTERVAL '1 month';
      WHEN 'ANO' THEN v_start_date := (now() AT TIME ZONE 'Africa/Luanda')::date - INTERVAL '1 year';
      ELSE v_start_date := (now() AT TIME ZONE 'Africa/Luanda')::date;
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
  SELECT COALESCE(SUM(total_amount), 0) INTO v_vendas_total FROM public.orders WHERE status IN ('closed', 'paid');
  
  -- CÁLCULOS TEMPORAIS (COM FILTROS DE DATA)
  -- Vendas do período selecionado
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_vendas_periodo, v_orders_count
  FROM public.orders
  WHERE created_at::date >= v_start_date 
    AND created_at::date <= v_end_date
    AND status IN ('closed', 'paid');
  
  -- Vendas de hoje (apenas do dia atual em Angola)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_vendas_hoje
  FROM public.orders
  WHERE created_at::date = (now() AT TIME ZONE 'Africa/Luanda')::date
    AND status IN ('closed', 'paid');
  
  -- Calcular ticket médio
  IF v_orders_count > 0 THEN
    v_avg_ticket := v_vendas_periodo / v_orders_count;
  END IF;
  
  -- Calcular IVA (6.5%) sobre o total consolidado
  v_tax_amount := (v_vendas_periodo + v_historico) * 0.065;
  
  -- Construir resultado JSON com nomes case-sensitive corretos
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

-- 3. VERIFICAÇÃO DE SCHEMA E DADOS
SELECT 'VERIFICAÇÃO FINAL - SCHEMA PUBLIC:' as info;
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('business_stats', 'expenses', 'orders', 'staff')
ORDER BY table_name;

-- 4. TESTE DIRETO DOS DADOS
SELECT 'TESTE DIRETO - DADOS EXISTENTES:' as info;
SELECT 'business_stats' as tabela, COUNT(*) as registros, COALESCE(SUM(legacy_revenue_kz), 0) as soma FROM public.business_stats
UNION ALL
SELECT 'expenses' as tabela, COUNT(*) as registros, COALESCE(SUM(amount_kz), 0) as soma FROM public.expenses
UNION ALL
SELECT 'orders' as tabela, COUNT(*) as registros, COALESCE(SUM(total_amount), 0) as soma FROM public.orders WHERE status IN ('closed', 'paid');

-- 5. Testar função para garantir funcionamento
SELECT get_dashboard_metrics('HOJE') as test_result;
