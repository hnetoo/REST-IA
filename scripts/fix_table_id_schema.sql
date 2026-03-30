-- =====================================================
-- CORRIGIR INCONSISTÊNCIA: orders.table_id deve ser INTEGER
-- (igual ao pos_tables.id)
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Verificar tipos atuais das colunas
SELECT 
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'table_id';

-- 2. ALTERAR o tipo de table_id de UUID para INTEGER
-- Isso permite referenciar pos_tables.id corretamente
ALTER TABLE orders 
ALTER COLUMN table_id TYPE INTEGER 
USING NULL; -- Converte valores existentes para NULL (serão atualizados depois)

-- 3. Verificar se a alteração funcionou
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'table_id';

-- 4. ATUALIZAR pedidos sem mesa para usar mesa 1
UPDATE orders 
SET table_id = 1
WHERE table_id IS NULL;

-- 5. VERIFICAR resultado
SELECT 
    table_id,
    COUNT(*) as total_pedidos,
    SUM(total_amount) as valor_total
FROM orders 
WHERE status = 'closed'
GROUP BY table_id
ORDER BY total_pedidos DESC;

-- 6. Confirmar que não há mais pedidos sem mesa
SELECT COUNT(*) as pedidos_sem_mesa
FROM orders 
WHERE table_id IS NULL AND status = 'closed';
