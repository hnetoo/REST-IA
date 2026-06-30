-- ORDEM DIRETA: REMOVER PRISMA E UNIFICAR SCHEMA
-- Migração final para tabelas plurais padrão Supabase

-- =====================================================
-- 1. REMOVER TABELAS DUPLICADAS DO PRISMA (SINGULAR)
-- =====================================================

-- Remover tabelas singulares criadas pelo Prisma se existirem
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;

-- =====================================================
-- 2. GARANTIR TABELAS OFICIAIS (PLURAL - PADRÃO SUPABASE)
-- =====================================================

-- Criar tabela categories se não existir
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela products se não existir
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    category_id UUID NOT NULL REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela orders se não existir
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    total_amount NUMERIC(10,2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela order_items se não existir
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. DESATIVAR RLS NAS TABELAS OFICIAIS
-- =====================================================

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. DADOS DE EXEMPLO (SE TABELAS ESTIVEREM VAZIAS)
-- =====================================================

-- Inserir categorias de exemplo se tabela estiver vazia
INSERT INTO categories (name) VALUES 
('Bebidas'),
('Petiscos'),
('Pratos Principais'),
('Sobremesas')
ON CONFLICT DO NOTHING;

-- Inserir produtos de exemplo se tabela estiver vazia
INSERT INTO products (name, price, image_url, is_active, category_id) VALUES 
('Cuca 1L', 3500, NULL, true, (SELECT id FROM categories WHERE name = 'Bebidas' LIMIT 1)),
('Fanta Laranja 2L', 2800, NULL, true, (SELECT id FROM categories WHERE name = 'Bebidas' LIMIT 1)),
('Mufete', 12000, NULL, true, (SELECT id FROM categories WHERE name = 'Pratos Principais' LIMIT 1)),
('Muamba de Galinha', 8500, NULL, true, (SELECT id FROM categories WHERE name = 'Pratos Principais' LIMIT 1)),
('Coxinha de Frango', 2500, NULL, true, (SELECT id FROM categories WHERE name = 'Petiscos' LIMIT 1))
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar estrutura final
SELECT 'categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'order_items' as table_name, COUNT(*) as count FROM order_items;
