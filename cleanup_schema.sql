-- ORDEM DIRETA: REMOVER PRISMA E UNIFICAR SCHEMA
-- Limpeza completa - manter apenas tabelas padrão Supabase (plural)

-- =====================================================
-- 1. REMOVER TABELAS DUPLICADAS DO PRISMA (SINGULAR)
-- =====================================================

-- Remover tabelas singulares criadas pelo Prisma
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;

-- =====================================================
-- 2. VERIFICAR TABELAS OFICIAIS (PLURAL - PADRÃO SUPABASE)
-- =====================================================

-- Tabelas que devem permanecer (padrão Supabase)
SELECT 'categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'order_items' as table_name, COUNT(*) as count FROM order_items;

-- =====================================================
-- 3. VERIFICAR ESTRUTURA DAS TABELAS OFICIAIS
-- =====================================================

-- Estrutura esperada para categories
\d categories;

-- Estrutura esperada para products  
\d products;

-- Estrutura esperada para orders
\d orders;

-- Estrutura esperada para order_items
\d order_items;

-- =====================================================
-- 4. CORRIGIR TABELAS OFICIAIS SE NECESSÁRIO
-- =====================================================

-- Garantir que categories tenha os campos corretos
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remover colunas extras de categories
ALTER TABLE categories 
DROP COLUMN IF EXISTS icon,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS is_visible,
DROP COLUMN IF EXISTS sort_order;

-- Garantir que products tenha os campos corretos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS category_id UUID NOT NULL REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remover colunas extras de products
ALTER TABLE products 
DROP COLUMN IF EXISTS image,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS cost_price,
DROP COLUMN IF EXISTS categoryid,
DROP COLUMN IF EXISTS active;

-- =====================================================
-- 5. DESATIVAR RLS NAS TABELAS OFICIAIS
-- =====================================================

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. REMOVER POLÍTICAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "Users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can create categories" ON categories;
DROP POLICY IF EXISTS "Users can update categories" ON categories;
DROP POLICY IF EXISTS "Users can delete categories" ON categories;

DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

DROP POLICY IF EXISTS "Users can view order_items" ON order_items;
DROP POLICY IF EXISTS "Users can create order_items" ON order_items;
DROP POLICY IF EXISTS "Users can update order_items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order_items" ON order_items;

-- =====================================================
-- 7. VERIFICAÇÃO FINAL
-- =====================================================

-- Listar todas as tabelas (deve mostrar apenas as 4 oficiais)
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar relacionamentos
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';

-- Verificar dados de exemplo
SELECT 'Categorias' as tipo, COUNT(*) as total FROM categories
UNION ALL
SELECT 'Produtos', COUNT(*) FROM products
UNION ALL  
SELECT 'Pedidos', COUNT(*) FROM orders
UNION ALL
SELECT 'Itens de Pedido', COUNT(*) FROM order_items;
