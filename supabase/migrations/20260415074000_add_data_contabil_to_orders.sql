-- Adicionar coluna data_contabil na tabela orders para implementar Dia Operacional
-- data_contabil representa o dia fiscal da venda (business day)
-- Se venda entre 00:00-05:00, data_contabil = dia anterior
-- Caso contrário, data_contabil = dia atual

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS data_contabil DATE;

-- Atualizar registros existentes para definir data_contabil baseado em created_at
-- Assumindo que fechamentos anteriores foram feitos antes das 05:00
UPDATE orders 
SET data_contabil = DATE(created_at - INTERVAL '1 hour') -- Ajuste para Africa/Luanda UTC+1
WHERE data_contabil IS NULL;

-- Criar índice para performance em queries por data_contabil
CREATE INDEX IF NOT EXISTS idx_orders_data_contabil ON orders(data_contabil);
