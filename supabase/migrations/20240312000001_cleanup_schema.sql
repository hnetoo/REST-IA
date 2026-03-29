-- ORDEM DIRETA: REMOVER PRISMA E UNIFICAR SCHEMA
-- Limpeza completa - manter apenas tabelas padrão Supabase (plural)

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
-- 4. REMOVER POLÍTICAS EXISTENTES
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
-- 5. DADOS DE EXEMPLO (SE TABELAS ESTIVEREM VAZIAS)
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
-- 6. ATUALIZAR UPDATED_AT TRIGGER
-- =====================================================

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
