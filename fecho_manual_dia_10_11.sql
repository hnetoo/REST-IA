-- 🔧 FECHO MANUAL DOS DIAS 10 E 11 DE JUNHO 2026
-- ⚠️ EXECUTAR COM CUIDADO - Verificar valores antes de confirmar

-- ============================================
-- DIA 10/06/2026
-- ============================================

-- Verificar vendas do dia 10 antes de inserir
SELECT 
    'DIA 10 - VENDAS:' as info,
    COUNT(*) as total_vendas,
    SUM(total_amount) as valor_total
FROM orders 
WHERE data_contabil = '2026-06-10' 
    AND status IN ('closed', 'paid');

-- Inserir fecho de caixa para dia 10 (descomentar para executar)
/*
INSERT INTO cash_flow (amount, category, type, description, data_contabil, closed_by, created_at, updated_at)
VALUES (
    133100.00,  -- Valor total das vendas do dia 10
    'FECHO_CAIXA',
    'entrada',
    'Fecho de caixa - 25 vendas (manual)',
    '2026-06-10',
    'Admin (Manual)',
    NOW(),
    NOW()
)
ON CONFLICT (category, data_contabil) 
DO UPDATE SET 
    amount = EXCLUDED.amount,
    description = EXCLUDED.description || ' (atualizado manual)',
    closed_by = EXCLUDED.closed_by,
    updated_at = NOW();
*/

-- Marcar dia 10 como fechado (descomentar para executar)
/*
INSERT INTO closed_days (date) 
VALUES ('2026-06-10')
ON CONFLICT (date) DO NOTHING;
*/

-- ============================================
-- DIA 11/06/2026  
-- ============================================

-- Verificar vendas do dia 11 antes de inserir
SELECT 
    'DIA 11 - VENDAS:' as info,
    COUNT(*) as total_vendas,
    SUM(total_amount) as valor_total
FROM orders 
WHERE data_contabil = '2026-06-11' 
    AND status IN ('closed', 'paid');

-- Inserir fecho de caixa para dia 11 (descomentar para executar)
/*
INSERT INTO cash_flow (amount, category, type, description, data_contabil, closed_by, created_at, updated_at)
VALUES (
    203600.00,  -- Valor total das vendas do dia 11
    'FECHO_CAIXA',
    'entrada',
    'Fecho de caixa - 21 vendas (manual)',
    '2026-06-11',
    'Admin (Manual)',
    NOW(),
    NOW()
)
ON CONFLICT (category, data_contabil) 
DO UPDATE SET 
    amount = EXCLUDED.amount,
    description = EXCLUDED.description || ' (atualizado manual)',
    closed_by = EXCLUDED.closed_by,
    updated_at = NOW();
*/

-- Marcar dia 11 como fechado (descomentar para executar)
/*
INSERT INTO closed_days (date) 
VALUES ('2026-06-11')
ON CONFLICT (date) DO NOTHING;
*/

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================
SELECT 
    'RESULTADO:' as info,
    data_contabil,
    amount,
    closed_by,
    created_at
FROM cash_flow 
WHERE category = 'FECHO_CAIXA' 
    AND data_contabil IN ('2026-06-10', '2026-06-11')
ORDER BY data_contabil;
