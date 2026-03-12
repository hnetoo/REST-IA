-- MIGRAR DADOS DAS TABELAS ANTIGAS PARA AS NOVAS
-- Executar se a tabela products estiver vazia

-- =====================================================
-- 1. VERIFICAR SE TABELA PRODUCTS ESTÁ VAZIA
-- =====================================================

-- Verificar se há dados na tabela products
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    
    IF product_count = 0 THEN
        RAISE NOTICE 'Tabela products está vazia. Iniciando migração...';
        
        -- =====================================================
        -- 2. MIGRAR DADOS DA TABELA ANTIGA Product (SE EXISTIR)
        -- =====================================================
        
        -- Verificar se tabela antiga Product existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'Product'
        ) THEN
            RAISE NOTICE 'Tabela Product encontrada. Migrando dados...';
            
            -- Migrar produtos da tabela Product para products
            INSERT INTO products (id, name, price, image_url, is_active, category_id, created_at, updated_at)
            SELECT 
                id,
                name,
                price::NUMERIC(10,2),
                image_url,
                is_active,
                category_id,
                created_at,
                updated_at
            FROM "Product"
            ON CONFLICT (id) DO NOTHING;
            
            RAISE NOTICE 'Dados da tabela Product migrados para products';
        ELSE
            RAISE NOTICE 'Tabela Product não encontrada. Pulando migração...';
        END IF;
        
        -- =====================================================
        -- 3. MIGRAR DADOS DA TABELA ANTIGA Category (SE EXISTIR)
        -- =====================================================
        
        -- Verificar se tabela antiga Category existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'Category'
        ) THEN
            RAISE NOTICE 'Tabela Category encontrada. Migrando dados...';
            
            -- Migrar categorias da tabela Category para categories
            INSERT INTO categories (id, name, created_at, updated_at)
            SELECT 
                id,
                name,
                created_at,
                updated_at
            FROM "Category"
            ON CONFLICT (id) DO NOTHING;
            
            RAISE NOTICE 'Dados da tabela Category migrados para categories';
        ELSE
            RAISE NOTICE 'Tabela Category não encontrada. Pulando migração...';
        END IF;
        
        -- =====================================================
        -- 4. REMOVER TABELAS ANTIGAS
        -- =====================================================
        
        -- Remover tabelas antigas após migração
        DROP TABLE IF EXISTS "Product" CASCADE;
        DROP TABLE IF EXISTS "Category" CASCADE;
        
        RAISE NOTICE 'Tabelas antigas removidas com sucesso';
        
    ELSE
        RAISE NOTICE 'Tabela products já contém dados. Pulando migração...';
    END IF;
END $$;

-- =====================================================
-- 5. VERIFICAÇÃO FINAL
-- =====================================================

-- Contar dados nas tabelas novas
SELECT 
    'categories' as tabela, 
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) > 0 THEN 'COM DADOS'
        ELSE 'VAZIA'
    END as status
FROM categories
UNION ALL
SELECT 
    'products' as tabela, 
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) > 0 THEN 'COM DADOS'
        ELSE 'VAZIA'
    END as status
FROM products;

-- Verificar se tabelas antigas ainda existem
SELECT 
    table_name,
    'AINDA EXISTE' as status
FROM information_schema.tables 
WHERE table_name IN ('Product', 'Category')
UNION ALL
SELECT 
    'Nenhuma tabela antiga encontrada' as table_name,
    'LIMPO' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name IN ('Product', 'Category')
);
