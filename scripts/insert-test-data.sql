-- INSERÇÃO DE DADOS DE TESTE
-- 1 Order de 5.000 Kz
-- 1 Cash Flow (Saída) de 1.000 Kz

-- Inserir 1 Order de 5.000 Kz
INSERT INTO orders (
  id,
  customer_name,
  total_amount,
  status,
  payment_method,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Cliente Teste',
  5000.00,
  'pending',
  'NUMERARIO',
  NOW(),
  NOW()
);

-- Inserir 1 Cash Flow (Saída) de 1.000 Kz
INSERT INTO cash_flow (
  id,
  amount,
  type,
  category,
  description,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  1000.00,
  'saida',
  'Operacional',
  'Despesa de teste',
  NOW(),
  NOW()
);

-- Confirmar inserção
SELECT 
  'Test data inserted successfully' as status,
  (SELECT COUNT(*) FROM orders WHERE total_amount = 5000.00) as orders_count,
  (SELECT COUNT(*) FROM cash_flow WHERE amount = 1000.00 AND type = 'saida') as cash_flow_count;
