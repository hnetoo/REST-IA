-- Remover políticas RLS do bucket products
DROP POLICY IF EXISTS "Allow public upload to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from products bucket" ON storage.objects;

-- Desabilitar RLS na tabela storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
