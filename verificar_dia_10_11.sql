-- 🔍 VERIFICAR DIAS 10 E 11 DE JUNHO 2026

-- 1. Verificar fechos de caixa para dia 10 e 11
SELECT 
    '=== FECHOS DE CAIXA ===' as secao;

SELECT 
    id,
    amount,
    data_contabil,
    closed_by,
    created_at,
    description
FROM cash_flow 
WHERE category = 'FECHO_CAIXA'
    AND data_contabil IN ('2026-06-10', '2026-06-11')
ORDER BY data_contabil, created_at;

-- 2. Verificar vendas (orders) para dia 10 e 11
SELECT 
    '=== VENDAS ===' as secao;

SELECT 
    data_contabil,
    COUNT(*) as total_vendas,
    SUM(total_amount) as valor_total,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as vendas_fechadas,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as vendas_pagas,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as vendas_abertas
FROM orders 
WHERE data_contabil IN ('2026-06-10', '2026-06-11')
GROUP BY data_contabil
ORDER BY data_contabil DESC;

-- 3. Ver dias fechados (closed_days)
SELECT 
    '=== DIAS FECHADOS ===' as secao;

SELECT * FROM closed_days 
WHERE date IN ('2026-06-10', '2026-06-11')
ORDER BY date;

-- 4. Resumo final
SELECT 
    '=== RESUMO ===' as secao;

WITH vendas AS (
    SELECT 
        data_contabil,
        COUNT(*) as total_vendas,
        SUM(total_amount) as valor_vendas
    FROM orders 
    WHERE data_contabil IN ('2026-06-10', '2026-06-11')
        AND status IN ('closed', 'paid')
    GROUP BY data_contabil
),
fechos AS (
    SELECT 
        data_contabil,
        COUNT(*) as total_fechos,
        SUM(amount) as valor_fecho
    FROM cash_flow 
    WHERE category = 'FECHO_CAIXA'
        AND data_contabil IN ('2026-06-10', '2026-06-11')
    GROUP BY data_contabil
)
SELECT 
    v.data_contabil as dia,
    v.total_vendas,
    v.valor_vendas,
    COALESCE(f.total_fechos, 0) as fechos_registados,
    f.valor_fecho,
    CASE 
        WHEN f.total_fechos IS NULL THEN '❌ SEM FECHO DE CAIXA'
        WHEN f.valor_fecho != v.valor_vendas THEN '⚠️ VALOR DIFERENTE'
        ELSE '✅ OK'
    END as status
FROM vendas v
LEFT JOIN fechos f ON v.data_contabil = v.data_contabil
ORDER BY v.data_contabil DESC;
