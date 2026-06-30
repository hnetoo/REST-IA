-- 🔍 DIAGNÓSTICO SEGURO - NÃO MODIFICA NADA, SÓ LÊ

-- 1. Ver últimos 5 fechos de caixa (se existirem)
SELECT 
    id,
    amount,
    data_contabil,
    closed_by,
    created_at,
    description
FROM cash_flow 
WHERE category = 'FECHO_CAIXA'
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Ver dias fechados (closed_days)
SELECT * FROM closed_days ORDER BY date DESC LIMIT 5;

-- 3. Verificar se há vendas recentes sem fecho
WITH vendas_recentes AS (
    SELECT 
        data_contabil,
        COUNT(*) as total_vendas,
        SUM(total_amount) as valor_total
    FROM orders 
    WHERE status IN ('closed', 'paid')
        AND data_contabil >= (CURRENT_DATE - INTERVAL '5 days')::text
    GROUP BY data_contabil
),
fechos_existentes AS (
    SELECT data_contabil, COUNT(*) as total_fechos
    FROM cash_flow 
    WHERE category = 'FECHO_CAIXA'
    GROUP BY data_contabil
)
SELECT 
    v.data_contabil,
    v.total_vendas,
    v.valor_total,
    COALESCE(f.total_fechos, 0) as fechos_registados,
    CASE 
        WHEN f.total_fechos IS NULL THEN '❌ SEM FECHO'
        WHEN f.total_fechos > 1 THEN '⚠️ FECHOS DUPLICADOS'
        ELSE '✅ OK'
    END as status
FROM vendas_recentes v
LEFT JOIN fechos_existentes f ON v.data_contabil = f.data_contabil
ORDER BY v.data_contabil DESC;
