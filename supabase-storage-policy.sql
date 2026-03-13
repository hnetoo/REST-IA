-- POLÍTICA RLS PARA BUCKET 'products' - ACESSO PÚBLICO
-- Executar no Supabase SQL Editor

-- 1. Criar política para SELECT público (leitura anónima)
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'products'
)
WITH CHECK (true);

-- 2. Criar política para INSERT público (upload)
CREATE POLICY "Allow public insert access" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'products'
);

-- 3. Criar política para UPDATE público (atualização)
CREATE POLICY "Allow public update access" ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'products'
)
WITH CHECK (true);

-- 4. Criar política para DELETE público (remoção)
CREATE POLICY "Allow public delete access" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'products'
)
WITH CHECK (true);

-- 5. Ativar RLS na tabela storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Verificação final
SELECT 
    'Políticas criadas para bucket products' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%public%'
AND bucket_id = 'products';
