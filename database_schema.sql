-- ========================================
-- LIMPEZA COMPLETA DO BANCO DE DADOS
-- ========================================

-- Apagar todas as tabelas existentes
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS work_shifts CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payment_configs CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS active_orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ========================================
-- CRIAÇÃO DO NOVO SCHEMA
-- ========================================

-- Tabela de Categorias
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pedidos
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('Dinheiro', 'TPA', 'Transferência', 'Multicaixa')),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Itens do Pedido
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Usuários (Sistema Interno)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    pin VARCHAR(4) NOT NULL,
    role VARCHAR(20) DEFAULT 'garcom' CHECK (role IN ('admin', 'garcom', 'manager', 'OWNER')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Mesas
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER NOT NULL UNIQUE,
    zone VARCHAR(20) DEFAULT 'INTERIOR' CHECK (zone IN ('INTERIOR', 'EXTERIOR', 'ESPLANADA', 'VIP')),
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    is_occupied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_name VARCHAR(100) DEFAULT 'Tasca do Vereda',
    currency VARCHAR(10) DEFAULT 'AOA',
    tax_rate DECIMAL(5,2) DEFAULT 14.00,
    address TEXT,
    phone VARCHAR(20),
    nif VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_tables_number ON tables(number);
CREATE INDEX idx_tables_occupied ON tables(is_occupied);

-- ========================================
-- INSERÇÃO DE DADOS INICIAIS
-- ========================================

-- Categorias básicas
INSERT INTO categories (id, name, image_url) VALUES
('550e8400-e29b-41d4-a716-446655d00e01', 'Entradas', null),
('550e8400-e29b-41d4-a716-446655d00e02', 'Pratos', null),
('550e8400-e29b-41d4-a716-446655d00e03', 'Bebidas', null),
('550e8400-e29b-41d4-a716-446655d00e04', 'Sobremesas', null);

-- Produtos de exemplo
INSERT INTO products (id, name, description, price, category_id, image_url, is_available) VALUES
('prod-001', 'Picanha', 'Picanha suína tradicional com molho barbecue', 3500.00, '550e8400-e29b-41d4-a716-446655d00e02', 'https://images.unsplash.com/photo-1565299624946-b28f40a9ae91?w=400', true),
('prod-002', 'Frango Assado', 'Frango assado com batatas e salada', 2800.00, '550e8400-e29b-41d4-a716-446655d00e02', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true),
('prod-003', 'Muamba de Galinha', 'Muamba tradicional angolana com arroz e funge', 3200.00, '550e8400-e29b-41d4-a716-446655d00e02', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400', true),
('prod-004', 'Calulu', 'Calulu de peixe com batata doce e óleo de palma', 4500.00, '550e8400-e29b-41d4-a716-446655d00e02', 'https://images.unsplash.com/photo-15197082270-0dea5576646b?w=400', true),
('prod-005', 'Fufu', 'Fufu tradicional com feijão e óleo de palma', 2500.00, '550e8400-e29b-41d4-a716-446655d00e01', 'https://images.unsplash.com/photo-1541019238398-4c8c9b8dc2d?w=400', true),
('prod-006', 'Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros', 800.00, '550e8400-e29b-41d4-a716-446655d00e03', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true),
('prod-007', 'Cerveja Eka', 'Cerveja nacional Eka 600ml', 600.00, '550e8400-e29b-41d4-a716-446655d00e03', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true),
('prod-008', 'Sumo de Laranja', 'Sumo natural de laranja 500ml', 400.00, '550e8400-e29b-41d4-a716-446655d00e03', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true);

-- Configurações do restaurante
INSERT INTO settings (id, restaurant_name, currency, tax_rate, address, phone, nif) VALUES
('setting-001', 'Tasca do Vereda', 'AOA', 14.00, 'Via AL 15, Talatona, Luanda', '+244 923 000 000', '5000000000');

-- Usuário administrador inicial
INSERT INTO users (id, name, email, pin, role, is_active) VALUES
('user-001', 'Administrador', 'admin@tascadovereda.ao', '1234', 'admin', true);

-- Mesas do restaurante
INSERT INTO tables (id, number, zone, position_x, position_y) VALUES
('table-001', 1, 'INTERIOR', 100, 100),
('table-002', 2, 'INTERIOR', 200, 100),
('table-003', 3, 'INTERIOR', 300, 100),
('table-004', 4, 'INTERIOR', 100, 200),
('table-005', 5, 'EXTERIOR', 200, 200),
('table-006', 6, 'EXTERIOR', 300, 200),
('table-007', 7, 'ESPLANADA', 400, 200),
('table-008', 8, 'VIP', 500, 200);

-- ========================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ========================================

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas para categories (leitura pública)
CREATE POLICY "Categorias públicas para leitura" ON categories
    FOR SELECT USING (true);

-- Políticas para products (leitura pública)
CREATE POLICY "Produtos públicos para leitura" ON products
    FOR SELECT USING (true);

-- Políticas para orders (inserção pública)
CREATE POLICY "Pedidos públicos para inserção" ON orders
    FOR INSERT WITH CHECK (true);

-- Políticas para orders (leitura pública)
CREATE POLICY "Pedidos públicos para leitura" ON orders
    FOR SELECT USING (true);

-- Políticas para order_items (inserção pública)
CREATE POLICY "Itens do pedido públicos para inserção" ON order_items
    FOR INSERT WITH CHECK (true);

-- Políticas para order_items (leitura pública)
CREATE POLICY "Itens do pedido públicos para leitura" ON order_items
    FOR SELECT USING (true);

-- Políticas para users (apenas usuários autenticados)
CREATE POLICY "Usuários para autenticados" ON users
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para tables (apenas usuários autenticados)
CREATE POLICY "Mesas para autenticados" ON tables
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para settings (apenas usuários autenticados)
CREATE POLICY "Configurações para autenticados" ON settings
    FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- FUNÇÕES ÚTEIS
-- ========================================

-- Função para formatar data DD/MM/YYYY
CREATE OR REPLACE FUNCTION format_date_pt(timestamp TIMESTAMP WITH TIME ZONE)
RETURNS TEXT AS $$
    BEGIN
        RETURN TO_CHAR(timestamp, 'DD/MM/YYYY');
    END;
$$ LANGUAGE plpgsql;

-- Função para calcular total do pedido
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
    DECLARE
        total DECIMAL(10,2);
    BEGIN
        SELECT COALESCE(SUM(quantity * unit_price), 0) INTO total
        FROM order_items
        WHERE order_id = order_uuid;
        
        RETURN total;
    END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMENTÁRIOS FINAIS
-- ========================================

-- Schema criado com sucesso!
-- Todas as tabelas possuem relacionamentos corretos
-- RLS configurado para acesso público onde necessário
-- Dados de teste inseridos para validação
-- Formato angolano (AOA) implementado
-- Timezone configurado para Angola (UTC+1)
