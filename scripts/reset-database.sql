-- RESET LIMPO DAS TABELAS PRINCIPAIS
-- PROIBIDO: TOCAR EM categories e products

-- Limpar ordens e itens (em ordem de dependência)
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;

-- Limpar despesas e cash flow
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE cash_flow CASCADE;

-- Limpar histórico externo
TRUNCATE TABLE external_history CASCADE;

-- Confirmar operação
SELECT 'Database reset completed - tables truncated' as status;
