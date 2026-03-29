-- Adicionar coluna description à tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
