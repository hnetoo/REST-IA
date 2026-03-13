-- POLÍTICA RLS PARA BUCKET 'products' - ACESSO PÚBLICO
-- Executar no Supabase SQL Editor

-- 1. Verificar se a política já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public read access'
    ) THEN
        -- Criar política para acesso público ao bucket products
        CREATE POLICY "Allow public read access" ON storage.objects
        FOR SELECT
        USING (
            bucket_id = 'products'
        )
        WITH CHECK (true);
        
        RAISE NOTICE 'Política de acesso público ao bucket products criada';
    ELSE
        RAISE NOTICE 'Política de acesso público ao bucket products já existe';
    END IF;
END $$;

-- 2. Verificar se a política de inserção já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public insert access'
    ) THEN
        -- Criar política para inserção pública no bucket products
        CREATE POLICY "Allow public insert access" ON storage.objects
        FOR INSERT
        WITH CHECK (
            bucket_id = 'products'
        );
        
        RAISE NOTICE 'Política de inserção pública ao bucket products criada';
    ELSE
        RAISE NOTICE 'Política de inserção pública ao bucket products já existe';
    END IF;
END $$;

-- 3. Verificar se a política de atualização já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public update access'
    ) THEN
        -- Criar política para atualização pública no bucket products
        CREATE POLICY "Allow public update access" ON storage.objects
        FOR UPDATE
        USING (
            bucket_id = 'products'
        )
        WITH CHECK (true);
        
        RAISE NOTICE 'Política de atualização pública ao bucket products criada';
    ELSE
        RAISE NOTICE 'Política de atualização pública ao bucket products já existe';
    END IF;
END $$;

-- 4. Verificar se a política de deleção já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public delete access'
    ) THEN
        -- Criar política para deleção pública no bucket products
        CREATE POLICY "Allow public delete access" ON storage.objects
        FOR DELETE
        USING (
            bucket_id = 'products'
        )
        WITH CHECK (true);
        
        RAISE NOTICE 'Política de deleção pública ao bucket products criada';
    ELSE
        RAISE NOTICE 'Política de deleção pública ao bucket products já existe';
    END IF;
END $$;

-- 5. Verificar se RLS está ativo na tabela objects
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'objects' 
        AND rowsecurity = false
    ) THEN
        -- Ativar RLS na tabela objects
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS ativado na tabela storage.objects';
    ELSE
        RAISE NOTICE 'RLS já está ativado na tabela storage.objects';
    END IF;
END $$;

-- 6. Verificação final
SELECT 
    'Políticas criadas/verificadas' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%public%';
