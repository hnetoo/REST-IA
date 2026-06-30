-- 🔍 VERIFICAR FECHOS DE CAIXA DOS ÚLTIMOS DIAS
-- Executar no Supabase SQL Editor

-- 1. Buscar todos os fechos de caixa dos últimos 7 dias
SELECT 
    id,
    amount,
    category,
    data_contabil,
    closed_by,
    created_at,
    description
FROM cash_flow
WHERE category = 'FECHO_CAIXA'
    AND data_contabil >= (CURRENT_DATE - INTERVAL '7 days')::text
ORDER BY data_contabil DESC, created_at DESC;

-- 2. Contar fechos por data (últimos 7 dias)
SELECT 
    data_contabil,
    COUNT(*) as total_fechos,
    SUM(amount) as total_valor,
    MAX(created_at) as ultimo_fecho
FROM cash_flow
WHERE category = 'FECHO_CAIXA'
    AND data_contabil >= (CURRENT_DATE - INTERVAL '7 days')::text
GROUP BY data_contabil
ORDER BY data_contabil DESC;

-- 3. Verificar se há vendas (orders closed/paid) nos últimos dias SEM fecho correspondente
WITH dias_com_vendas AS (
    SELECT 
        data_contabil,
        COUNT(*) as total_vendas,
        SUM(total_amount) as total_faturado
    FROM orders
    WHERE status IN ('closed', 'paid')
        AND data_contabil >= (CURRENT_DATE - INTERVAL '7 days')::text
    GROUP BY data_contabil
),
dias_com_fecho AS (
    SELECT 
        data_contabil,
        COUNT(*) as total_fechos,
        SUM(amount) as valor_fecho
    FROM cash_flow
    WHERE category = 'FECHO_CAIXA'
        AND data_contabil >= (CURRENT_DATE - INTERVAL '7 days')::text
    GROUP BY data_contabil
)
SELECT 
    v.data_contabil,
    v.total_vendas,
    v.total_faturado,
    COALESCE(f.total_fechos, 0) as total_fechos,
    f.valor_fecho,
    CASE 
        WHEN f.total_fechos IS NULL THEN '❌ SEM FECHO - Precisa fazer fecho!'
        WHEN f.total_fechos > 1 THEN '⚠️ FECHO DUPLICADO'
        ELSE '✅ OK'
    END as status
FROM dias_com_vendas v
LEFT JOIN dias_com_fecho f ON v.data_contabil = f.data_contabil
ORDER BY v.data_contabil DESC;

-- 4. Verificar todas as entradas em cash_flow (não só FECHO_CAIXA) dos últimos 3 dias
SELECT 
    id,
    amount,
    category,
    type,
    data_contabil,
    description,
    closed_by,
    created_at
FROM cash_flow
WHERE data_contabil >= (CURRENT_DATE - INTERVAL '3 days')::text
ORDER BY created_at DESC
LIMIT 50;
