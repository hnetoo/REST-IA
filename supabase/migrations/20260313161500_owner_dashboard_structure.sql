-- Migration: Owner Dashboard Structure
-- Description: Create tables and functions for Owner Dashboard real data
-- Created: 2026-03-13 16:15:00

-- 1. TABELA BUSINESS_STATS (Histórico de Faturação Externa)
CREATE TABLE IF NOT EXISTS business_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_revenue_kz DECIMAL(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. VERIFICAÇÃO E ATUALIZAÇÃO DA TABELA ORDERS
-- Garantir colunas necessárias para cálculos de lucro
DO $$
BEGIN
  -- Verificar se a tabela orders existe
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- Adicionar coluna cost_amount se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'cost_amount') THEN
      ALTER TABLE orders ADD COLUMN cost_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Garantir que total_amount existe
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
      ALTER TABLE orders ADD COLUMN total_amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Garantir que created_at existe
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'created_at') THEN
      ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- 3. TABELA EXPENSES (Despesas Fixas)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount_kz DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('staff', 'rent', 'utilities', 'supplies', 'other')),
  is_recurring BOOLEAN DEFAULT FALSE,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. VERIFICAÇÃO DA TABELA STAFF (se existir, garantir coluna base_salary_kz)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'staff' AND column_name = 'base_salary_kz') THEN
      ALTER TABLE staff ADD COLUMN base_salary_kz DECIMAL(15,2) DEFAULT 0;
    END IF;
  END IF;
END $$;

-- 5. FUNÇÃO PARA CÁLCULO DE MÉTRICAS DO DASHBOARD
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
  
  -- Calcular faturação atual (orders)
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO v_total_revenue, v_orders_count
  FROM orders
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND status = 'closed';
  
  -- Calcular faturação de hoje
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_today_revenue
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
    AND status = 'closed';
  
  -- Calcular faturação histórica (business_stats)
  SELECT COALESCE(SUM(legacy_revenue_kz), 0)
  INTO v_historic_revenue
  FROM business_stats
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day';
  
  -- Calcular despesas totais
  SELECT COALESCE(SUM(amount_kz), 0)
  INTO v_total_expenses
  FROM expenses
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day';
  
  -- Calcular custos de staff
  SELECT COALESCE(SUM(base_salary_kz), 0)
  INTO v_staff_costs
  FROM staff;
  
  -- Calcular IVA (6.5%)
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

-- 6. POLÍTICAS RLS (Row Level Security)
-- Habilitar RLS nas tabelas
ALTER TABLE business_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para business_stats
CREATE POLICY "Anyone can read business_stats" ON business_stats
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated can insert business_stats" ON business_stats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para expenses
CREATE POLICY "Anyone can read expenses" ON expenses
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated can manage expenses" ON expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_business_stats_created_at ON business_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_business_stats_period ON business_stats(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 8. VIEW PARA CONSULTA SIMPLIFICADA
CREATE OR REPLACE VIEW dashboard_metrics_view AS
SELECT 
  get_dashboard_metrics('HOJE') as hoje,
  get_dashboard_metrics('SEMANA') as semana,
  get_dashboard_metrics('MÊS') as mes,
  get_dashboard_metrics('ANO') as ano;

-- 9. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_stats_updated_at 
  BEFORE UPDATE ON business_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
