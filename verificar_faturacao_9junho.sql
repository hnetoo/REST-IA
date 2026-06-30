-- ============================================================================
-- VERIFICAÇÃO DE FATURAÇÃO - 9 de Junho de 2026
-- Cole isto no SQL Editor do Supabase e corre para verificar os dados
-- ============================================================================

-- 1. TOTAL DE VENDAS DO DIA 9 DE JUNHO (data_contabil)
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount) as faturacao_total,
  AVG(total_amount) as media_por_order,
  MIN(total_amount) as menor_order,
  MAX(total_amount) as maior_order
FROM orders 
WHERE data_contabil = '2026-06-09' 
  AND status IN ('closed', 'paid');

-- 2. LISTA DETALHADA DE TODAS AS ORDERS DO DIA 9 (por valor decrescente)
SELECT 
  id,
  customer_name,
  total_amount,
  status,
  payment_method,
  invoice_number,
  data_contabil,
  created_at,
  updated_at
FROM orders 
WHERE data_contabil = '2026-06-09' 
  AND status IN ('closed', 'paid')
ORDER BY total_amount DESC;

-- 3. VERIFICAR ORDERS DUPLICADAS (mesmo invoice_number no mesmo dia)
SELECT 
  invoice_number,
  COUNT(*) as count,
  STRING_AGG(id, ', ') as order_ids,
  SUM(total_amount) as total_duplicado
FROM orders 
WHERE data_contabil = '2026-06-09' 
  AND status IN ('closed', 'paid')
  AND invoice_number IS NOT NULL
GROUP BY invoice_number
HAVING COUNT(*) > 1;

-- 4. VERIFICAR ORDERS COM MESMO ID (duplicação real)
SELECT id, COUNT(*) as occurrences
FROM orders 
WHERE data_contabil = '2026-06-09' 
  AND status IN ('closed', 'paid')
GROUP BY id 
HAVING COUNT(*) > 1;

-- 5. VERIFICAR SE HÁ ORDERS DE OUTROS DIAS COM data_contabil = 2026-06-09
-- (pode indicar data_contabil mal atribuída)
SELECT 
  data_contabil,
  DATE(created_at) as data_criacao,
  COUNT(*) as quantidade,
  SUM(total_amount) as total
FROM orders 
WHERE data_contabil = '2026-06-09' 
  AND status IN ('closed', 'paid')
GROUP BY data_contabil, DATE(created_at)
ORDER BY data_criacao;

-- 6. VERIFICAR ORDERS DO DIA 9 QUE ESTÃO COM OUTRO data_contabil
SELECT 
  data_contabil,
  COUNT(*) as quantidade,
  SUM(total_amount) as total
FROM orders 
WHERE DATE(created_at) = '2026-06-09' 
  AND status IN ('closed', 'paid')
GROUP BY data_contabil
ORDER BY data_contabil;

-- 7. ORDERS COM STATUS 'ABERTO' QUE PODEM ESTAR A CONTAMINAR (segurança)
SELECT 
  status,
  COUNT(*) as quantidade,
  SUM(total_amount) as total
FROM orders 
WHERE data_contabil = '2026-06-09'
GROUP BY status;

-- 8. ORDERS COM data_contabil NULL do dia 9 (fallback)
SELECT 
  id,
  customer_name,
  total_amount,
  status,
  created_at,
  data_contabil
FROM orders 
WHERE data_contabil IS NULL 
  AND DATE(created_at) = '2026-06-09'
  AND status IN ('closed', 'paid');

-- 9. COMPARAÇÃO: Faturação por dia (últimos 7 dias)
SELECT 
  data_contabil,
  COUNT(*) as orders,
  SUM(total_amount) as faturacao,
  AVG(total_amount) as media
FROM orders 
WHERE status IN ('closed', 'paid')
  AND data_contabil >= '2026-06-03'
GROUP BY data_contabil
ORDER BY data_contabil DESC;

-- 10. VERIFICAR external_history (se existe algum valor injetado)
SELECT * FROM external_history LIMIT 5;
