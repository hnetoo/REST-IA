-- Inserir despesas de teste na tabela cash_flow
-- Execute este SQL diretamente no Supabase SQL Editor

INSERT INTO cash_flow (id, amount, type, category, description, created_at, updated_at) VALUES
  (gen_random_uuid(), 25000, 'saida', 'Material de Escritório', 'Papel, canetas, impressora', CURRENT_DATE, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 15000, 'saida', 'Limpeza e Manutenção', 'Serviços de limpeza mensal', CURRENT_DATE, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 35000, 'saida', 'Utilidades', 'Fatura de água e luz', CURRENT_DATE - INTERVAL '1 day', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 12000, 'saida', 'Telecomunicações', 'Internet e telefone', CURRENT_DATE - INTERVAL '2 days', CURRENT_TIMESTAMP);

-- Verificar total inserido
SELECT 
  SUM(amount) as total_despesas,
  COUNT(*) as quantidade_despesas
FROM cash_flow 
WHERE type = 'saida';
