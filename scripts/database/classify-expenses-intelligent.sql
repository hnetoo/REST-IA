-- CLASSIFICAÇÃO INTELIGENTE DE DESPESAS - ANÁLISE REAL
-- Script para classificar cada despesa baseado na descrição específica

-- 1. PRIMEIRO, VERIFICAR OS DADOS REAIS EXISTENTES
SELECT 
    id, 
    description, 
    amount_kz, 
    category, 
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
FROM expenses 
ORDER BY created_at DESC;

-- 2. CLASSIFICAÇÃO ESPECÍFICA BASEADA EM DESCRIÇÕES REAIS

-- STAFF: Salários, gratificações, ajudas de custo
UPDATE expenses 
SET category = 'STAFF'
WHERE (
    LOWER(description) LIKE '%salário%' 
    OR LOWER(description) LIKE '%salario%'
    OR LOWER(description) LIKE '%gratifica%'
    OR LOWER(description) LIKE '%ajuda%'
    OR LOWER(description) LIKE '%ordenado%'
    OR LOWER(description) LIKE '%vencimento%'
    OR LOWER(description) LIKE '%subsídio%'
    OR LOWER(description) LIKE '%subsidio%'
    OR LOWER(description) LIKE '%funcionário%'
    OR LOWER(description) LIKE '%funcionario%'
    OR LOWER(description) LIKE '%staff%'
    OR LOWER(description) LIKE '%pessoal%'
    OR LOWER(description) LIKE '%remunera%'
)
AND category NOT IN ('STAFF');

-- MERCADORIA: Compras de produtos, matéria prima, fornecedores
UPDATE expenses 
SET category = 'MERCADORIA'
WHERE (
    LOWER(description) LIKE '%compra%'
    OR LOWER(description) LIKE '%mercadoria%'
    OR LOWER(description) LIKE '%produto%'
    OR LOWER(description) LIKE '%insumo%'
    OR LOWER(description) LIKE '%matéria prima%'
    OR LOWER(description) LIKE '%materia prima%'
    OR LOWER(description) LIKE '%fornecedor%'
    OR LOWER(description) LIKE '%stock%'
    OR LOWER(description) LIKE '%inventário%'
    OR LOWER(description) LIKE '%inventario%'
    OR LOWER(description) LIKE '%ingrediente%'
    OR LOWER(description) LIKE '%bebida alcoólica%'
    OR LOWER(description) LIKE '%refrigerante%'
    OR LOWER(description) LIKE '%cerveja%'
    OR LOWER(description) LIKE '%carne%'
    OR LOWER(description) LIKE '%peixe%'
    OR LOWER(description) LIKE '%fruta%'
    OR LOWER(description) LIKE '%legume%'
    OR LOWER(description) LIKE '%arroz%'
    OR LOWER(description) LIKE '%óleo%'
    OR LOWER(description) LIKE '%azeite%'
)
AND category NOT IN ('MERCADORIA');

-- UTILIDADES: Luz, água, internet, telefone, gás
UPDATE expenses 
SET category = 'UTILIDADES'
WHERE (
    LOWER(description) LIKE '%luz%'
    OR LOWER(description) LIKE '%água%'
    OR LOWER(description) LIKE '%agua%'
    OR LOWER(description) LIKE '%internet%'
    OR LOWER(description) LIKE '%telefone%'
    OR LOWER(description) LIKE '%telemóvel%'
    OR LOWER(description) LIKE '%telemovel%'
    OR LOWER(description) LIKE '%gás%'
    OR LOWER(description) LIKE '%gas%'
    OR LOWER(description) LIKE '%eletricidade%'
    OR LOWER(description) LIKE '%energia%'
    OR LOWER(description) LIKE '%saneamento%'
)
AND category NOT IN ('UTILIDADES');

-- RENDAS: Aluguer, arrendamento
UPDATE expenses 
SET category = 'RENDAS'
WHERE (
    LOWER(description) LIKE '%aluguer%'
    OR LOWER(description) LIKE '%aluguel%'
    OR LOWER(description) LIKE '%arrendamento%'
    OR LOWER(description) LIKE '%renda%'
    OR LOWER(description) LIKE '%locação%'
)
AND category NOT IN ('RENDAS');

-- IMPOSTOS: Taxas, impostos, tributos
UPDATE expenses 
SET category = 'IMPOSTOS'
WHERE (
    LOWER(description) LIKE '%imposto%'
    OR LOWER(description) LIKE '%taxa%'
    OR LOWER(description) LIKE '%iva%'
    OR LOWER(description) LIKE '%tributo%'
    OR LOWER(description) LIKE '%contribuição%'
    OR LOWER(description) LIKE '%contribuicao%'
    OR LOWER(description) LIKE '%fiscal%'
    OR LOWER(description) LIKE '%finanças%'
    OR LOWER(description) LIKE '%financas%'
)
AND category NOT IN ('IMPOSTOS');

-- MANUTENÇÃO: Reparos, conservação
UPDATE expenses 
SET category = 'MANUTENÇÃO'
WHERE (
    LOWER(description) LIKE '%manutenção%'
    OR LOWER(description) LIKE '%manutencao%'
    OR LOWER(description) LIKE '%reparo%'
    OR LOWER(description) LIKE '%conserto%'
    OR LOWER(description) LIKE '%conservação%'
    OR LOWER(description) LIKE '%conservacao%'
    OR LOWER(description) LIKE '%limpeza%'
    OR LOWER(description) LIKE '%pintura%'
    OR LOWER(description) LIKE '%obra%'
)
AND category NOT IN ('MANUTENÇÃO');

-- ALIMENTAÇÃO: Refeições, cárdapio, comida para staff
UPDATE expenses 
SET category = 'ALIMENTAÇÃO'
WHERE (
    LOWER(description) LIKE '%refeição%'
    OR LOWER(description) LIKE '%refeicao%'
    OR LOWER(description) LIKE '%comida%'
    OR LOWER(description) LIKE '%cárdapio%'
    OR LOWER(description) LIKE '%cardapio%'
    OR LOWER(description) LIKE '%almoço%'
    OR LOWER(description) LIKE '%almoco%'
    OR LOWER(description) LIKE '%jantar%'
    OR LOWER(description) LIKE '%lanche%'
    OR LOWER(description) LIKE '%staff meal%'
)
AND category NOT IN ('ALIMENTAÇÃO');

-- MARKETING: Publicidade, propaganda
UPDATE expenses 
SET category = 'MARKETING'
WHERE (
    LOWER(description) LIKE '%publicidade%'
    OR LOWER(description) LIKE '%propaganda%'
    OR LOWER(description) LIKE '%marketing%'
    OR LOWER(description) LIKE '%promoção%'
    OR LOWER(description) LIKE '%promocao%'
    OR LOWER(description) LIKE '%anúncio%'
    OR LOWER(description) LIKE '%anuncio%'
    OR LOWER(description) LIKE '%divulgação%'
    OR LOWER(description) LIKE '%divulgacao%'
)
AND category NOT IN ('MARKETING');

-- 3. VERIFICAR RESULTADO DA CLASSIFICAÇÃO
SELECT 
    category,
    COUNT(*) as quantidade,
    SUM(amount_kz) as total_kz,
    ROUND(SUM(amount_kz) * 100.0 / (SELECT SUM(amount_kz) FROM expenses), 2) as percentagem
FROM expenses 
WHERE category IS NOT NULL
GROUP BY category 
ORDER BY total_kz DESC;

-- 4. VERIFICAR SE FICOU ALGUM REGISTRO SEM CLASSIFICAÇÃO
SELECT 
    id, 
    description, 
    amount_kz, 
    category, 
    created_at
FROM expenses 
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   OR category NOT IN (
       'STAFF', 'MERCADORIA', 'UTILIDADES', 'RENDAS', 'IMPOSTOS', 
       'MANUTENÇÃO', 'ALIMENTAÇÃO', 'MARKETING', 'OUTROS'
   );

-- 5. PARA OS NÃO CLASSIFICADOS (se existirem), ATRIBUIR 'OUTROS' MANUALMENTE
UPDATE expenses 
SET category = 'OUTROS'
WHERE category IS NULL 
   OR category = '' 
   OR category = 'undefined'
   OR category NOT IN (
       'STAFF', 'MERCADORIA', 'UTILIDADES', 'RENDAS', 'IMPOSTOS', 
       'MANUTENÇÃO', 'ALIMENTAÇÃO', 'MARKETING', 'OUTROS'
   );

-- 6. VERIFICAÇÃO FINAL - DISTRIBUIÇÃO ESPERADA
SELECT 
    'DISTRIBUIÇÃO FINAL' as relatorio,
    category,
    COUNT(*) as quantidade,
    SUM(amount_kz) as total_kz,
    ROUND(SUM(amount_kz) * 100.0 / (SELECT SUM(amount_kz) FROM expenses), 2) as percentagem
FROM expenses 
GROUP BY category 
ORDER BY total_kz DESC;
