-- ============================================
-- CRIAR FUNÇÃO exec_sql PARA EXECUTAR MIGRAÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Dar permissão para authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- ============================================
-- ADICIONAR COLUNAS DE STOCK À TABELA PRODUCTS
-- ============================================

DO $$
BEGIN
    -- Adicionar stock_quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
    END IF;

    -- Adicionar unit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'un';
    END IF;

    -- Adicionar sku
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku TEXT;
    END IF;

    -- Adicionar min_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 10;
    END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Atualizar produtos existentes
UPDATE products 
SET stock_quantity = COALESCE(stock_quantity, 0),
    unit = COALESCE(unit, 'un'),
    min_stock = COALESCE(min_stock, 10)
WHERE stock_quantity IS NULL 
   OR unit IS NULL 
   OR min_stock IS NULL;

-- ============================================
-- CORRIGIR CATEGORIAS COM UUIDs INVÁLIDOS
-- ============================================

-- Remover produtos que referenciam categorias inválidas
UPDATE products 
SET category_id = NULL
WHERE category_id IN (
    SELECT id FROM categories
    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Remover categorias com UUID inválido
DELETE FROM categories
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ============================================
-- CONFIRMAÇÃO
-- ============================================
SELECT 
    '✅ Correções aplicadas!' AS status,
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM categories) AS total_categories;
