-- Adicionar coluna data_contabil na tabela cash_flow para implementar Dia Operacional
-- data_contabil representa o dia fiscal do fecho de caixa (business day)
-- Se fecho entre 00:00-05:00, data_contabil = dia anterior
-- Caso contrário, data_contabil = dia atual

ALTER TABLE cash_flow 
ADD COLUMN IF NOT EXISTS data_contabil DATE;

-- Atualizar registros existentes para definir data_contabil baseado em created_at
UPDATE cash_flow 
SET data_contabil = DATE(created_at - INTERVAL '1 hour') -- Ajuste para Africa/Luanda UTC+1
WHERE data_contabil IS NULL;

-- Criar índice para performance em queries por data_contabil
CREATE INDEX IF NOT EXISTS idx_cash_flow_data_contabil ON cash_flow(data_contabil);
