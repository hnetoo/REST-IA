-- ============================================================================
-- VERIFICAR ITENS DAS ORDERS MAIORES (9 de Junho 2026)
-- ============================================================================

-- 1. VER ITENS DA ORDER DE 345.500 Kz (Petiscos)
SELECT 
  o.id,
  o.customer_name,
  o.total_amount,
  o.invoice_number,
  o.items
FROM orders o
WHERE o.id = 'ord-1781028310820';

-- 2. VER ITENS DA ORDER DE 323.300 Kz (Cliente)
SELECT 
  o.id,
  o.customer_name,
  o.total_amount,
  o.invoice_number,
  o.items
FROM orders o
WHERE o.id = 'd09e3b08-66bd-4647-ad37-b6ee8a2b59bd';

-- 3. VER TODOS OS ORDER_ITEMS (tabela relacionada) para estas orders
SELECT 
  oi.order_id,
  oi.product_id,
  oi.quantity,
  oi.unit_price,
  oi.total_price
FROM order_items oi
WHERE oi.order_id IN (
  'ord-1781028310820',
  'd09e3b08-66bd-4647-ad37-b6ee8a2b59bd'
)
ORDER BY oi.order_id, oi.total_price DESC;

-- 4. VERIFICAR SE HÁ ORDERS COM MESMO CONTEÚDO MAS IDs DIFERENTES
-- (comparar por total_amount e created_at próximo)
SELECT 
  o1.id as id1,
  o2.id as id2,
  o1.total_amount as total1,
  o2.total_amount as total2,
  o1.created_at,
  o2.created_at,
  ABS(EXTRACT(EPOCH FROM (o1.created_at - o2.created_at))) as segundos_diferenca
FROM orders o1
JOIN orders o2 ON o1.id < o2.id
WHERE o1.data_contabil = '2026-06-09'
  AND o2.data_contabil = '2026-06-09'
  AND o1.status IN ('closed', 'paid')
  AND o2.status IN ('closed', 'paid')
  AND o1.total_amount = o2.total_amount
  AND ABS(EXTRACT(EPOCH FROM (o1.created_at - o2.created_at))) < 60
ORDER BY segundos_diferenca;

-- 5. VER ORDER_ITEMS DE TODAS AS ORDERS DO DIA 9 (resumo)
SELECT 
  oi.order_id,
  o.customer_name,
  COUNT(oi.id) as num_items,
  SUM(oi.quantity) as total_quantidade,
  SUM(oi.total_price) as total_itens
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.data_contabil = '2026-06-09'
  AND o.status IN ('closed', 'paid')
GROUP BY oi.order_id, o.customer_name
ORDER BY total_itens DESC;

-- 6. COMPARAR: total_amount da order vs soma dos order_items
SELECT 
  o.id,
  o.customer_name,
  o.total_amount as order_total,
  COALESCE(SUM(oi.total_price), 0) as items_total,
  o.total_amount - COALESCE(SUM(oi.total_price), 0) as diferenca
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.data_contabil = '2026-06-09'
  AND o.status IN ('closed', 'paid')
GROUP BY o.id, o.customer_name, o.total_amount
HAVING ABS(o.total_amount - COALESCE(SUM(oi.total_price), 0)) > 100
ORDER BY diferenca DESC;
