-- =====================================================================
-- DIAGNÓSTICO: Verificar fechos de caixa registados no Supabase
-- Executar no Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1. Verificar todos os fechos de caixa registados (últimos 30 dias)
SELECT 
  id,
  amount,
  category,
  description,
  data_contabil,
  closed_by,
  created_at,
  updated_at
FROM cash_flow
WHERE category = 'FECHO_CAIXA'
  AND data_contabil >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY data_contabil DESC;

-- 2. Verificar dias marcados como fechados (closed_days)
SELECT 
  id,
  date,
  closed_at
FROM closed_days
WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY date DESC;

-- 3. Comparar: dias com vendas vs dias com fecho de caixa
SELECT 
  o.data_contabil,
  COUNT(o.id) AS total_vendas,
  COUNT(o.id) FILTER (WHERE o.status IN ('closed', 'paid')) AS vendas_fechadas,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status IN ('closed', 'paid')), 0) AS total_faturado,
  CASE 
    WHEN cf.id IS NOT NULL THEN 'COM FECHO'
    ELSE 'SEM FECHO'
  END AS status_fecho,
  cf.amount AS valor_fecho,
  cf.closed_by AS operador_fecho,
  cf.created_at AS data_registo_fecho
FROM orders o
LEFT JOIN cash_flow cf ON cf.data_contabil = o.data_contabil AND cf.category = 'FECHO_CAIXA'
WHERE o.data_contabil >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY o.data_contabil, cf.id, cf.amount, cf.closed_by, cf.created_at
ORDER BY o.data_contabil DESC;

-- 4. Verificar se a tabela fecho_diagnostico_logs existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'fecho_diagnostico_logs'
) AS tabela_existe;

-- 5. Verificar vendas por dia (últimos 7 dias) que NÃO têm fecho
SELECT 
  o.data_contabil,
  COUNT(o.id) AS total_vendas,
  COALESCE(SUM(o.total_amount), 0) AS total_faturado
FROM orders o
WHERE o.data_contabil >= (CURRENT_DATE - INTERVAL '7 days')
  AND o.status IN ('closed', 'paid')
  AND NOT EXISTS (
    SELECT 1 FROM cash_flow cf 
    WHERE cf.data_contabil = o.data_contabil 
    AND cf.category = 'FECHO_CAIXA'
  )
GROUP BY o.data_contabil
ORDER BY o.data_contabil DESC;

-- 6. Verificar constraint unique na tabela cash_flow
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE rel.relname = 'cash_flow'
ORDER BY con.contype;
