-- CORREÇÃO DE MÉTODOS DE PAGAMENTO - INTEGRIDADE DE DADOS
-- Script para identificar e corrigir apenas métodos inválidos, sem defaults

-- 1. IDENTIFICAR TODOS OS MÉTODOS DE PAGAMENTO EXISTENTES
SELECT 
    payment_method,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz,
    STRING_AGG(DISTINCT id::text, ', ' ORDER BY id) as ordens_ids
FROM orders 
GROUP BY payment_method 
ORDER BY quantidade DESC;

-- 2. IDENTIFICAR REGISTROS COM MÉTODOS INVÁLIDOS OU NULOS
SELECT 
    id,
    customer_name,
    total_amount,
    payment_method,
    created_at,
    CASE 
        WHEN payment_method IS NULL THEN 'NULO - PRECISA CLASSIFICAR'
        WHEN payment_method NOT IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA') THEN 'INVÁLIDO - ' || payment_method
        ELSE 'VÁLIDO'
    END as status
FROM orders 
WHERE payment_method IS NULL 
   OR payment_method NOT IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA')
   OR payment_method IN ('M-PESA', 'OUTRO', 'OUTROS', 'M-PESA', 'MPESA')
ORDER BY created_at DESC;

-- 3. ATUALIZAR APENAS MÉTODOS CLARAMENTE IDENTIFICÁVEIS
-- M-PESA variants (se houver evidência no ID ou descrição)
UPDATE orders 
SET payment_method = 'TRANSFERENCIA'
WHERE payment_method IN ('M-PESA', 'MPESA', 'M-PESA')
   AND (
       LOWER(customer_name) LIKE '%mpesa%'
       OR LOWER(invoice_number) LIKE '%mpesa%'
       OR id::text LIKE '%MPESA%'
   );

-- OUTRO/OUTROS para A CLASSIFICAR (não inventar método)
UPDATE orders 
SET payment_method = 'A CLASSIFICAR'
WHERE payment_method IN ('OUTRO', 'OUTROS')
   AND payment_method NOT IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA');

-- NULOS para A CLASSIFICAR (não inventar método)
UPDATE orders 
SET payment_method = 'A CLASSIFICAR'
WHERE payment_method IS NULL;

-- 4. VERIFICAR RESULTADO DA CORREÇÃO
SELECT 
    'APÓS CORREÇÃO' as status,
    payment_method,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz,
    ROUND(SUM(total_amount) * 100.0 / (SELECT SUM(total_amount) FROM orders), 2) as percentagem
FROM orders 
GROUP BY payment_method 
ORDER BY quantidade DESC;

-- 5. VERIFICAR SE FICOU ALGUM REGISTRO INVÁLIDO
SELECT 
    'VERIFICAÇÃO FINAL' as verificacao,
    COUNT(*) as registros_invalidos,
    SUM(total_amount) as total_invalido_kz
FROM orders 
WHERE payment_method IS NULL 
   OR payment_method NOT IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA', 'A CLASSIFICAR');

-- 6. ADICIONAR CHECK CONSTRAINT NO PRISMA (DEPOIS DA LIMPEZA)
-- Descomente apenas após garantir que não há mais inválidos
-- ALTER TABLE orders ADD CONSTRAINT chk_payment_method 
--   CHECK (payment_method IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA', 'A CLASSIFICAR'));

-- 7. RELATÓRIO FINAL PARA HÉLDER
SELECT 
    'RESUMO PARA CORREÇÃO MANUAL' as titulo,
    payment_method,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz,
    STRING_AGG(DISTINCT id::text ORDER BY created_at DESC) as ids_para_verificar
FROM orders 
WHERE payment_method = 'A CLASSIFICAR'
GROUP BY payment_method;
