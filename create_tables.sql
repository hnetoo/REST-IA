-- Create tables first, then enable Realtime
-- Execute in Supabase SQL Editor step by step

-- Step 1: Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    name VARCHAR(100) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create products table
CREATE TABLE IF NOT EXISTS "products" (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id TEXT REFERENCES "categories"(id) ON DELETE CASCADE,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create orders table
CREATE TABLE IF NOT EXISTS "orders" (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    table_number INTEGER,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    payment_method VARCHAR(20),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create order_items table
CREATE TABLE IF NOT EXISTS "order_items" (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    order_id TEXT REFERENCES "orders"(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES "products"(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create users table
CREATE TABLE IF NOT EXISTS "users" (
    id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    pin VARCHAR(4) NOT NULL,
    role VARCHAR(20) DEFAULT 'garcom',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Insert sample data
INSERT INTO "categories" (id, name) VALUES
('cat-001', 'Entradas'),
('cat-002', 'Pratos'),
('cat-003', 'Bebidas'),
('cat-004', 'Sobremesas')
ON CONFLICT DO NOTHING;

INSERT INTO "products" (id, name, description, price, category_id, image_url, is_available) VALUES
('prod-001', 'Picanha', 'Picanha suína tradicional com molho barbecue', 3500.00, 'cat-002', 'https://images.unsplash.com/photo-1565299624946-b28f40a9ae91?w=400', true),
('prod-002', 'Frango Assado', 'Frango assado com batatas e salada', 2800.00, 'cat-002', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true),
('prod-003', 'Muamba de Galinha', 'Muamba tradicional angolana com arroz e funge', 3200.00, 'cat-002', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400', true),
('prod-004', 'Calulu', 'Calulu de peixe com batata doce e óleo de palma', 4500.00, 'cat-002', 'https://images.unsplash.com/photo-15197082270-0dea5576646b?w=400', true),
('prod-005', 'Fufu', 'Fufu tradicional com feijão e óleo de palma', 2500.00, 'cat-001', 'https://images.unsplash.com/photo-1541019238398-4c8c9b8dc2d?w=400', true),
('prod-006', 'Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros', 800.00, 'cat-003', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true),
('prod-007', 'Cerveja Eka', 'Cerveja nacional Eka 600ml', 600.00, 'cat-003', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true),
('prod-008', 'Sumo de Laranja', 'Sumo natural de laranja 500ml', 400.00, 'cat-003', 'https://images.unsplash.com/photo-1596797018594-101f5b94a7db?w=400', true)
ON CONFLICT DO NOTHING;

-- Step 7: Enable RLS
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
CREATE POLICY "Enable read access for all users" ON "categories" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "products" FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON "orders" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "orders" FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON "order_items" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "order_items" FOR SELECT USING (true);

-- Step 9: Enable Realtime (if publication exists)
DO $$
BEGIN
    -- Check if publication exists
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime') THEN
        -- Add tables to realtime publication
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "products";
        EXCEPTION WHEN OTHERS THEN
            -- Table might already be in publication
            NULL;
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "categories";
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "orders";
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "order_items";
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;
