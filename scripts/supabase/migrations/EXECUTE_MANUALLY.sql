# ============================================
# MIGRAÇÃO SQL - Colunas de Stock e Categorias
# Execute este script no SQL Editor do Supabase
# ============================================

-- 1. Criar função exec_sql se não existir
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- 2. Adicionar colunas de stock à tabela products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'un';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 10;
    END IF;
END $$;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 4. Atualizar produtos existentes com valores padrão
UPDATE products 
SET stock_quantity = COALESCE(stock_quantity, 0),
    unit = COALESCE(unit, 'un'),
    min_stock = COALESCE(min_stock, 10)
WHERE stock_quantity IS NULL 
   OR unit IS NULL 
   OR min_stock IS NULL;

-- 5. Corrigir categorias com UUIDs inválidos
UPDATE products 
SET category_id = NULL
WHERE category_id IN (
    SELECT id FROM categories
    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

DELETE FROM categories
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 6. Verificar resultado
SELECT 
    '✅ Migração concluída!' AS status,
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM categories) AS total_categories,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'products' AND column_name = 'stock_quantity') AS has_stock_column;
