-- POLÍTICA RLS PARA BUCKET 'products' - ACESSO PÚBLICO
-- Executar no Supabase SQL Editor

-- 1. Criar política para SELECT público (leitura anónima)
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'products'
);

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
);

-- 4. Criar política para DELETE público (remoção)
CREATE POLICY "Allow public delete access" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'products'
);

-- 5. Ativar RLS na tabela storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Verificação final (sem pg_policies - apenas confirmação)
SELECT 
    'Políticas criadas com sucesso para bucket products' as status,
    4 as total_policies;
