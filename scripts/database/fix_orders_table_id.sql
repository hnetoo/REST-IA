-- =====================================================
-- SQL PARA ATRIBUIR MESA AOS PEDIDOS SEM table_id
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. PRIMEIRO: Verificar quantos pedidos estão sem mesa
SELECT 
    COUNT(*) as total_pedidos_sem_mesa,
    MIN(created_at) as pedido_mais_antigo,
    MAX(created_at) as pedido_mais_recente
FROM orders 
WHERE table_id IS NULL;

-- 2. VERIFICAR mesas disponíveis
SELECT id, name, status 
FROM pos_tables 
ORDER BY id;

-- 3. CRIAR uma mesa padrão se não houver nenhuma (opcional)
-- Descomente se quiser criar uma mesa "Geral" para pedidos antigos
-- INSERT INTO pos_tables (id, name, status, x, y, created_at, updated_at)
-- VALUES (
--     gen_random_uuid(),
--     'Mesa Geral (Pedidos Antigos)',
--     'LIVRE',
--     0,
--     0,
--     NOW(),
--     NOW()
-- );

-- 4. OPÇÃO A: Atribuir TODOS os pedidos sem mesa para uma mesa específica
-- (substitua o UUID abaixo pelo ID da mesa que você copiou do passo 2)
-- UPDATE orders 
-- SET table_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
-- WHERE table_id IS NULL;

-- 4. OPÇÃO B: Atribuir automaticamente para a PRIMEIRA mesa existente
UPDATE orders 
SET table_id = (SELECT id::uuid FROM pos_tables ORDER BY id LIMIT 1)
WHERE table_id IS NULL;

-- 5. OPÇÃO B: Distribuir pedigos entre mesas existentes (round-robin)
-- Se tiver múltiplas mesas e quiser distribuir os pedidos igualmente
-- Descomente e ajuste conforme necessário:

-- WITH pedidos_sem_mesa AS (
--     SELECT id, 
--            ROW_NUMBER() OVER (ORDER BY created_at) as row_num
--     FROM orders 
--     WHERE table_id IS NULL
-- ),
-- mesas_disponiveis AS (
--     SELECT id as mesa_id,
--            ROW_NUMBER() OVER (ORDER BY id) as mesa_num
--     FROM pos_tables
--     WHERE status = 'LIVRE' OR status = 'OCUPADO'
-- ),
-- total_mesas AS (
--     SELECT COUNT(*) as count FROM mesas_disponiveis
-- )
-- UPDATE orders 
-- SET table_id = (
--     SELECT m.mesa_id::text 
--     FROM pedidos_sem_mesa p
--     JOIN mesas_disponiveis m 
--         ON ((p.row_num - 1) % (SELECT count FROM total_mesas)) + 1 = m.mesa_num
--     WHERE p.id = orders.id
-- )
-- WHERE table_id IS NULL;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todos os pedidos agora têm mesa
SELECT 
    table_id,
    COUNT(*) as total_pedidos,
    SUM(total_amount) as valor_total
FROM orders 
WHERE status = 'closed'
GROUP BY table_id
ORDER BY total_pedidos DESC;

-- Verificar pedidos que ainda estão sem mesa (deve ser 0)
SELECT COUNT(*) as pedidos_sem_mesa_restantes
FROM orders 
WHERE table_id IS NULL AND status = 'closed';
