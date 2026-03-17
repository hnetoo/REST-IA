-- AUTO-SCHEMA PARA TASCA DO VEREDA POS v1.0.6
-- Criação automática de tabelas necessárias para a aplicação

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    category_id TEXT REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Funcionários (Staff)
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT,
    base_salary_kz REAL DEFAULT 0,
    status TEXT DEFAULT 'ATIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Mesas (Tables)
CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL UNIQUE,
    status TEXT DEFAULT 'LIVRE',
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    balance REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    table_number INTEGER,
    total_amount REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'ABERTO',
    payment_method TEXT,
    invoice_number TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens dos Pedidos (Order Items)
-- NOTA: Esta tabela NÃO tem coluna status (conforme verificado)
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount_kz REAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'PENDENTE',
    provider TEXT,
    receipt_url TEXT,
    proforma_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Configurações (Settings)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    restaurant_name TEXT DEFAULT 'Tasca do Vereda',
    currency TEXT DEFAULT 'AOA',
    tax_rate REAL DEFAULT 0.14,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Histórico Externo (External History)
CREATE TABLE IF NOT EXISTS external_history (
    id TEXT PRIMARY KEY,
    total_revenue REAL DEFAULT 0,
    gross_profit REAL DEFAULT 0,
    source_name TEXT,
    period TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- Inserir configurações padrão
INSERT OR IGNORE INTO settings (id, restaurant_name, currency, tax_rate) 
VALUES ('main', 'Tasca do Vereda', 'AOA', 0.14);

-- Inserir categorias padrão
INSERT OR IGNORE INTO categories (id, name) VALUES 
('cat-1', 'Entradas'),
('cat-2', 'Pratos Principais'),
('cat-3', 'Acompanhamentos'),
('cat-4', 'Bebidas'),
('cat-5', 'Sobremesas'),
('cat-6', 'Outros');

-- Inserir produtos exemplo
INSERT OR IGNORE INTO products (id, name, description, price, category_id, is_active, is_available) VALUES 
('prod-1', 'Muamba de Frango', 'Muamba tradicional com frango, ginguba e óleo de palma', 3500, 'cat-2', true, true),
('prod-2', 'Frango Frito', 'Porção de frango frito com batatas', 2800, 'cat-2', true, true),
('prod-3', 'Arroz Branco', 'Arroz branco cozido', 1500, 'cat-3', true, true),
('prod-4', 'Feijão de Óleo de Palma', 'Feijão cozido com óleo de palma', 1200, 'cat-3', true, true),
('prod-5', 'Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros', 800, 'cat-4', true, true),
('prod-6', 'Fanta Laranja 2L', 'Refrigerante Fanta Laranja 2 litros', 750, 'cat-4', true, true),
('prod-7', 'Água Mineral 500ml', 'Água mineral sem gás 500ml', 200, 'cat-4', true, true),
('prod-8', 'Mussse de Ginguba', 'Mussse tradicional de ginguba', 500, 'cat-5', true, true),
('prod-9', 'Salada de Tomate', 'Salada fresca de tomate e cebola', 800, 'cat-1', true, true);

-- Inserir mesas padrão
INSERT OR IGNORE INTO tables (number, status) VALUES 
(1, 'LIVRE'),
(2, 'LIVRE'),
(3, 'LIVRE'),
(4, 'LIVRE'),
(5, 'LIVRE'),
(6, 'LIVRE'),
(7, 'LIVRE'),
(8, 'LIVRE'),
(9, 'LIVRE'),
(10, 'LIVRE');
