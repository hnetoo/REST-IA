-- CORREÇÃO DO SCHEMA DA TABELA PRODUCTS
-- Executar este script primeiro para corrigir a tabela products

-- =====================================================
-- 1. VERIFICAR ESTRUTURA ATUAL
-- =====================================================

-- Verificar se a coluna is_active existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_active'
    ) THEN
        -- Adicionar coluna is_active se não existir
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Coluna is_active adicionada à tabela products';
    ELSE
        RAISE NOTICE 'Coluna is_active já existe na tabela products';
    END IF;
END $$;

-- Verificar se a coluna image_url existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'image_url'
    ) THEN
        -- Adicionar coluna image_url se não existir
        ALTER TABLE products ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Coluna image_url adicionada à tabela products';
    ELSE
        RAISE NOTICE 'Coluna image_url já existe na tabela products';
    END IF;
END $$;

-- Verificar se a coluna category_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category_id'
    ) THEN
        -- Adicionar coluna category_id se não existir
        ALTER TABLE products ADD COLUMN category_id UUID;
        RAISE NOTICE 'Coluna category_id adicionada à tabela products';
    ELSE
        RAISE NOTICE 'Coluna category_id já existe na tabela products';
    END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR ESTRUTURA FINAL
-- =====================================================

-- Mostrar estrutura atual da tabela products
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- Verificar se todas as colunas necessárias existem
SELECT 
    'is_active' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'is_active'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'image_url' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'image_url'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'category_id' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category_id'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;
