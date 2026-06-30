-- VERIFICAÇÃO DE DADOS DE TESTE
-- Conferir os valores que o Dashboard deve mostrar

-- Verificar Order de 5.000 Kz
SELECT 
  'ORDERS' as table_name,
  COUNT(*) as count,
  COALESCE(SUM(total_amount), 0) as total_amount
FROM orders 
WHERE status = 'pending';

-- Verificar Cash Flow de 1.000 Kz (saída)
SELECT 
  'CASH_FLOW_SAIDAS' as table_name,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total_amount
FROM cash_flow 
WHERE type = 'saida';

-- Verificar Despesas (expenses) - deve estar vazio
SELECT 
  'EXPENSES' as table_name,
  COUNT(*) as count,
  COALESCE(SUM(amount_kz), 0) as total_amount
FROM expenses;

-- Verificar External History - deve estar vazio
SELECT 
  'EXTERNAL_HISTORY' as table_name,
  COUNT(*) as count,
  COALESCE(SUM(total_revenue), 0) as total_amount
FROM external_history;

-- Cálculo final esperado no Dashboard
SELECT 
  'DASHBOARD_EXPECTED' as calculation,
  5000.00 as rendimento_global_esperado,
  1000.00 as despesas_hoje_esperado,
  (5000.00 - 1000.00) as lucro_liquido_esperado;
