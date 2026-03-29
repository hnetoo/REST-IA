-- Adicionar coluna cost_price à tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
