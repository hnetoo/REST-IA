-- AUDITORIA DE SINCRONIZAÇÃO E BASE DE DADOS (STRICT MODE)
-- Verificação e correção do schema Supabase vs Prisma

-- =====================================================
-- 1. CHECK DB SCHEMA - VERIFICAR TABELAS ATUAIS
-- =====================================================

-- Verificar estrutura atual da tabela Product
\d products;

-- Verificar estrutura atual da tabela Category  
\d categories;

-- =====================================================
-- 2. CORREÇÃO DO SCHEMA - ALINHAR COM PRISMA
-- =====================================================

-- Se necessário, corrigir tabela Product para match exato com Prisma
-- Campos Prisma: id, name, price, image_url, is_active, category_id

-- Remover colunas extras (se existirem)
ALTER TABLE products 
DROP COLUMN IF EXISTS active,
DROP COLUMN IF EXISTS image,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS cost_price,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- Adicionar colunas faltantes (se não existirem)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS category_id UUID NOT NULL;

-- Garantir tipo correto do price (Decimal 10,2 para Kwanzas)
ALTER TABLE products 
ALTER COLUMN price TYPE NUMERIC(10,2);

-- Se necessário, corrigir tabela Category para match exato com Prisma
-- Campos Prisma: id, name

-- Remover colunas extras (se existirem)
ALTER TABLE categories 
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS description;

-- =====================================================
-- 3. RLS BYPASS - DESATIVAR POLÍTICAS
-- =====================================================

-- Desativar RLS para Product
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Desativar RLS para Category
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Ou remover políticas existentes
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

DROP POLICY IF EXISTS "Users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can create categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

-- =====================================================
-- 4. VERIFICAR RELACIONAMENTOS
-- =====================================================

-- Verificar se foreign key existe
\d products;

-- Se não existir, criar relacionamento
ALTER TABLE products 
ADD CONSTRAINT products_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

-- =====================================================
-- 5. LIMPEZA DE DADOS INCONSISTENTES
-- =====================================================

-- Remover produtos sem categoria válida
DELETE FROM products 
WHERE category_id IS NULL 
OR category_id NOT IN (SELECT id FROM categories);

-- =====================================================
-- 6. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar estrutura final
\d products;
\d categories;

-- Verificar dados
SELECT 'Products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories;

-- Verificar relacionamentos
SELECT p.name as product_name, c.name as category_name 
FROM products p 
JOIN categories c ON p.category_id = c.id 
LIMIT 5;
