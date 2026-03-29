-- VERIFICAÇÃO EXATA DOS VALORES DO DASHBOARD
-- Simular o cálculo do useSyncCore

-- 1. Revenue Engine: External History (0) + Orders (5.000)
SELECT 
  'REVENUE_ENGINE' as component,
  COALESCE(SUM(total_revenue), 0) as external_history_total,
  0 as expected_external
FROM external_history;

SELECT 
  'ORDERS_REVENUE' as component,
  COUNT(*) as orders_count,
  COALESCE(SUM(total_amount), 0) as orders_total
FROM orders 
WHERE status = 'pending';

-- 2. Expense Engine: Expenses (0) + Cash Flow Saídas (1.000)
SELECT 
  'EXPENSES_TOTAL' as component,
  COUNT(*) as expenses_count,
  COALESCE(SUM(amount_kz), 0) as expenses_total
FROM expenses;

SELECT 
  'CASH_FLOW_SAIDAS' as component,
  COUNT(*) as cash_flow_count,
  COALESCE(SUM(amount), 0) as cash_flow_total
FROM cash_flow 
WHERE type = 'saida';

-- 3. Staff Costs (0 - não temos staff)
SELECT 
  'STAFF_COSTS' as component,
  COUNT(*) as staff_count,
  COALESCE(SUM(base_salary_kz), 0) as staff_total
FROM staff 
WHERE status = 'active';

-- 4. Resumo Final - Valores Esperados no Dashboard
SELECT 
  'DASHBOARD_FINAL' as calculation,
  5000.00 as total_revenue_expected,
  1000.00 as total_expenses_expected,
  0 as staff_costs_expected,
  (5000.00 - 1000.00 - 0) as net_profit_expected;
