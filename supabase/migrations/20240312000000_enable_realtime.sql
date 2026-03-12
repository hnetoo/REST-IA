-- Enable Realtime for critical tables
-- Execute this in Supabase SQL Editor

-- Add tables to supabase_realtime publication (ignorar se já existir)
-- Nota: PostgreSQL não suporta IF NOT EXISTS para ALTER PUBLICATION
-- Vamos verificar primeiro se já existe

DO $$
BEGIN
    -- Add orders se não estiver na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "orders";
    END IF;

    -- Add order_items se não estiver na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "order_items";
    END IF;

    -- Add products se não estiver na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "products";
    END IF;

    -- Add categories se não estiver na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "categories";
    END IF;
END $$;

-- Verify tables were added
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Grant necessary permissions for Realtime
GRANT SELECT ON "orders" TO authenticated;
GRANT SELECT ON "order_items" TO authenticated;
GRANT SELECT ON "products" TO authenticated;
GRANT SELECT ON "categories" TO authenticated;

-- Create policies for public read access (ignorar se já existir)
DO $$
BEGIN
    -- Create policy for products se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "products" FOR SELECT USING (true);
    END IF;

    -- Create policy for categories se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "categories" FOR SELECT USING (true);
    END IF;

    -- Create policy for orders se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "orders" FOR SELECT USING (true);
    END IF;

    -- Create policy for order_items se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "order_items" FOR SELECT USING (true);
    END IF;
END $$;
CREATE POLICY "Enable insert for all users" ON "orders" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "orders" FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON "order_items" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "order_items" FOR SELECT USING (true);
