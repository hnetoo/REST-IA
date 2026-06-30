-- Configurar bucket products para permitir uploads públicos
-- Habilitar RLS no bucket products
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir upload público de imagens no bucket products
CREATE POLICY "Allow public upload to products bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'products');

-- Política para permitir leitura pública de imagens no bucket products
CREATE POLICY "Allow public read from products bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'products');

-- Política para permitir atualização pública de imagens no bucket products
CREATE POLICY "Allow public update in products bucket"
ON storage.objects FOR UPDATE
TO anon, authenticated
WITH CHECK (bucket_id = 'products');

-- Política para permitir deleção pública de imagens no bucket products
CREATE POLICY "Allow public delete from products bucket"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'products');
