-- LIMPEZA MANDATÓRIA DE DADOS NULOS - TABELA EXPENSES
-- Script para corrigir categorias nulas e adicionar constraints

-- 1. IDENTIFICAR REGISTROS COM CATEGORIAS NULAS OU INVÁLIDAS
SELECT 
    id, 
    description, 
    amount_kz, 
    category, 
    created_at,
    CASE 
        WHEN category IS NULL OR category = '' OR category = 'undefined' THEN 'NEEDS_UPDATE'
        ELSE 'OK'
    END as status
FROM expenses 
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   OR category NOT IN (
       'STAFF', 'MERCADORIA', 'UTILIDADES', 'RENDAS', 'IMPOSTOS', 
       'MANUTENÇÃO', 'ALIMENTAÇÃO', 'MARKETING', 'OUTROS'
   );

-- 2. ATUALIZAR CATEGORIAS BASEADO NA DESCRIÇÃO (REGRAS DE NEGÓCIO)
UPDATE expenses 
SET category = 'STAFF'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%salário%' 
       OR LOWER(description) LIKE '%staff%'
       OR LOWER(description) LIKE '%funcionário%'
       OR LOWER(description) LIKE '%ordenado%'
       OR LOWER(description) LIKE '%salario%'
   );

UPDATE expenses 
SET category = 'COMPRAS'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%compra%'
       OR LOWER(description) LIKE '%mercadoria%'
       OR LOWER(description) LIKE '%produto%'
       OR LOWER(description) LIKE '%insumo%'
       OR LOWER(description) LIKE '%matéria prima%'
   );

UPDATE expenses 
SET category = 'RENDAS'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%renda%'
       OR LOWER(description) LIKE '%aluguel%'
       OR LOWER(description) LIKE '%arrendamento%'
   );

UPDATE expenses 
SET category = 'IMPOSTOS'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%imposto%'
       OR LOWER(description) LIKE '%taxa%'
       OR LOWER(description) LIKE '%iva%'
       OR LOWER(description) LIKE '%tributo%'
   );

UPDATE expenses 
SET category = 'MANUTENÇÃO'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%manutenção%'
       OR LOWER(description) LIKE '%manutencao%'
       OR LOWER(description) LIKE '%reparo%'
       OR LOWER(description) LIKE '%conserto%'
   );

UPDATE expenses 
SET category = 'ALIMENTAÇÃO'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%alimento%'
       OR LOWER(description) LIKE '%comida%'
       OR LOWER(description) LIKE '%refeição%'
       OR LOWER(description) LIKE '%cárdapio%'
   );

UPDATE expenses 
SET category = 'UTILIDADES'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   AND (
       LOWER(description) LIKE '%água%'
       OR LOWER(description) LIKE '%luz%'
       OR LOWER(description) LIKE '%energia%'
       OR LOWER(description) LIKE '%internet%'
       OR LOWER(description) LIKE '%telefone%'
   );

-- 3. PARA REGISTROS QUE NÃO BATERAM COM NENHUMA REGRA, ATRIBUIR 'OUTROS' TEMPORARIAMENTE
UPDATE expenses 
SET category = 'OUTROS'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined';

-- 4. VERIFICAR RESULTADO
SELECT 
    category,
    COUNT(*) as count,
    SUM(amount_kz) as total_amount
FROM expenses 
GROUP BY category 
ORDER BY count DESC;

-- 5. ADICIONAR CONSTRAINT NOT NULL (DEPOIS DA LIMPEZA)
-- ATENÇÃO: Execute apenas após garantir que não há mais nulos
-- ALTER TABLE expenses ALTER COLUMN category SET NOT NULL;

-- 6. ADICIONAR CHECK CONSTRAINT PARA CATEGORIAS VÁLIDAS
-- ALTER TABLE expenses ADD CONSTRAINT chk_category 
--   CHECK (category IN (
--     'STAFF', 'COMPRAS', 'MERCADORIA', 'RENDAS', 'IMPOSTOS', 
--     'MANUTENCAO', 'MANUTENÇÃO', 'ALIMENTACAO', 'ALIMENTAÇÃO', 
--     'BEBIDAS', 'MATERIAL_LIMPEZA', 'UTILIDADES', 'REPARACOES', 
--     'REPARAÇÕES', 'MARKETING', 'OUTROS'
--   ));

-- 7. REMOVER CAMPO DUPLICADO (SE EXISTIR)
-- ALTER TABLE expenses DROP COLUMN IF EXISTS category_name;
