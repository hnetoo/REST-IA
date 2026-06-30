-- ============================================
-- MIGRAÇÃO: Adicionar colunas de stock à tabela products
-- ============================================

DO $$
BEGIN
    -- Adicionar stock_quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna stock_quantity adicionada';
    END IF;

    -- Adicionar unit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'un';
        RAISE NOTICE 'Coluna unit adicionada';
    END IF;

    -- Adicionar sku
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku TEXT;
        RAISE NOTICE 'Coluna sku adicionada';
    END IF;

    -- Adicionar min_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 10;
        RAISE NOTICE 'Coluna min_stock adicionada';
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Atualizar produtos existentes com valores padrão
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

-- Verificar se há categorias com ID inválido (não UUID)
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Contar categorias com UUID inválido
    SELECT COUNT(*) INTO invalid_count
    FROM categories
    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF invalid_count > 0 THEN
        RAISE NOTICE 'Encontradas % categorias com UUID inválido', invalid_count;
        
        -- Atualizar produtos que referenciam categorias inválidas para NULL
        UPDATE products 
        SET category_id = NULL
        WHERE category_id IN (
            SELECT id FROM categories
            WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        );
        
        -- Remover categorias inválidas
        DELETE FROM categories
        WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        RAISE NOTICE 'Categorias inválidas removidas';
    ELSE
        RAISE NOTICE 'Nenhuma categoria com UUID inválido encontrada';
    END IF;
END $$;

-- ============================================
-- LIMPAR PRODUTOS COM category_id INVÁLIDO
-- ============================================

-- Verificar produtos com category_id que não existe na tabela categories
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.category_id IS NOT NULL AND c.id IS NULL;

    IF orphan_count > 0 THEN
        RAISE NOTICE 'Encontrados % produtos com categoria inexistente', orphan_count;
        
        -- Definir category_id como NULL para produtos órfãos
        UPDATE products 
        SET category_id = NULL
        WHERE id IN (
            SELECT p.id 
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.category_id IS NOT NULL AND c.id IS NULL
        );
        
        RAISE NOTICE 'Produtos órfãos corrigidos';
    END IF;
END $$;

-- ============================================
-- CONFIRMAÇÃO
-- ============================================
SELECT 
    '✅ Migração concluída!' AS status,
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM categories) AS total_categories,
    (SELECT COUNT(*) FROM products WHERE stock_quantity IS NOT NULL) AS products_with_stock;
