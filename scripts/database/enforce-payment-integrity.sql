-- LIMPEZA FINAL E CONSTRAINT BANCO - INTEGRIDADE TOTAL
-- Script para eliminar todos os "A CLASSIFICAR" e forçar integridade

-- 1. ANALISAR REGISTOS "A CLASSIFICAR" ANTES DA LIMPEZA
SELECT 
    'ANTES DA LIMPEZA' as status,
    payment_method,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz,
    STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as ids_para_analisar
FROM orders 
WHERE payment_method = 'A CLASSIFICAR'
GROUP BY payment_method;

-- 2. VERIFICAR SE HÁ ALGUM REGISTRO REALMENTE SEM MÉTODO
SELECT 
    'REGISTROS SEM MÉTODO' as status,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz
FROM orders 
WHERE payment_method IS NULL
GROUP BY payment_method;

-- 3. VERIFICAR MÉTODOS INVÁLIDOS RESTANTES
SELECT 
    'MÉTODOS INVÁLIDOS' as status,
    payment_method,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz
FROM orders 
WHERE payment_method NOT IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA')
   AND payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY quantidade DESC;

-- 4. REMOVER TODOS OS REGISTROS "A CLASSIFICAR" (APENAS SE HOUVER PROVA REAL)
-- ATENÇÃO: Execute apenas APÓS analisar os dados acima
DELETE FROM orders 
WHERE payment_method = 'A CLASSIFICAR';

-- 5. ATUALIZAR NULOS PARA "SEM MÉTODO" (PARA IDENTIFICAÇÃO VISUAL)
-- NÃO usar métodos reais para não mascarar dados
UPDATE orders 
SET payment_method = 'SEM MÉTODO'
WHERE payment_method IS NULL;

-- 6. VERIFICAR RESULTADO DA LIMPEZA
SELECT 
    'APÓS LIMPEZA' as status,
    payment_method,
    COUNT(*) as quantidade,
    SUM(total_amount) as total_kz,
    ROUND(SUM(total_amount) * 100.0 / (SELECT SUM(total_amount) FROM orders WHERE payment_method IS NOT NULL), 2) as percentagem
FROM orders 
WHERE payment_method IS NOT NULL
GROUP BY payment_method 
ORDER BY total_kz DESC;

-- 7. ADICIONAR CHECK CONSTRAINT NO PRISMA (BLOQUEIO TOTAL)
-- Execute apenas após garantir que todos os dados estão corretos
/*
-- Descomente estas linhas no schema.prisma:
model orders {
  // ... outros campos ...
  payment_method String    // NOT NULL - OBRIGATÓRIO
  @@map("chk_payment_method", "ALTER TABLE orders ADD CONSTRAINT chk_payment_method CHECK (payment_method IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA', 'SEM MÉTODO'))")
}

-- E execute esta migration no Supabase:
ALTER TABLE orders 
ADD CONSTRAINT chk_payment_method 
CHECK (payment_method IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA', 'SEM MÉTODO'));
*/

-- 8. RELATÓRIO FINAL DE INTEGRIDADE
SELECT 
    'INTEGRIDADE FINAL' as verificacao,
    'REGISTROS VÁLIDOS' as total_validos,
    'REGISTROS SEM MÉTODO' as total_sem_metodo,
    'MÉTODOS INVÁLIDOS' as total_invalidos,
    CASE 
        WHEN COUNT(*) = SUM(CASE WHEN payment_method IN ('NUMERARIO', 'TPA', 'QRCODE', 'TRANSFERENCIA', 'SEM MÉTODO') THEN 1 ELSE 0 END) 
        THEN '✅ INTEGRIDADE GARANTIDA'
        ELSE '❌ EXISTEM REGISTROS INVÁLIDOS'
    END as status_integridade
FROM orders;
