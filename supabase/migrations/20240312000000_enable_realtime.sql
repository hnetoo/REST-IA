-- Enable Realtime for critical tables
-- Execute this in Supabase SQL Editor

-- Verificar se a publicação existe antes de adicionar tabelas
DO $$
BEGIN
    -- Criar publicação se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication 
        WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    -- Adicionar products se existir e não estiver na publicação
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'products' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "products";
    END IF;

    -- Adicionar categories se existir e não estiver na publicação
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "categories";
    END IF;
END $$;

-- Grant necessary permissions for Realtime (apenas para tabelas que existem)
DO $$
BEGIN
    -- Products
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'products' AND table_schema = 'public'
    ) THEN
        GRANT SELECT ON "products" TO authenticated;
        GRANT SELECT ON "products" TO anon;
    END IF;

    -- Categories
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories' AND table_schema = 'public'
    ) THEN
        GRANT SELECT ON "categories" TO authenticated;
        GRANT SELECT ON "categories" TO anon;
    END IF;
END $$;

-- Create policies for public access (apenas se as tabelas existirem)
DO $$
BEGIN
    -- Create policy for categories se não existir
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "categories" FOR SELECT USING (true);
    END IF;

    -- Create policy for products se não existir
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'products' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "products" FOR SELECT USING (true);
    END IF;
END $$;

-- Verify tables were added
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
