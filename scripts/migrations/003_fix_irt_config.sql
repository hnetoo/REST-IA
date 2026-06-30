-- ============================================
-- FIX: irt_config constraint + populate
-- ============================================

-- 1. Limpar tabela (se existir dados ruins)
TRUNCATE TABLE irt_config;

-- 2. Remover indices antigos que podem conflitar
DROP INDEX IF EXISTS idx_irt_config_bracket_year;

-- 3. Adicionar constraint UNIQUE necessaria para ON CONFLICT
ALTER TABLE irt_config 
  DROP CONSTRAINT IF EXISTS irt_config_bracket_year_unique;

ALTER TABLE irt_config 
  ADD CONSTRAINT irt_config_bracket_year_unique 
  UNIQUE (bracket, year);

-- 4. Popular tabela IRT Angola 2024
INSERT INTO irt_config (bracket, min_amount, max_amount, tax_rate, year)
VALUES
  (1, 0, 100000, 0.00, 2024),
  (2, 100001, 150000, 0.13, 2024),
  (3, 150001, 200000, 0.16, 2024),
  (4, 200001, 300000, 0.19, 2024),
  (5, 300001, 500000, 0.21, 2024),
  (6, 500001, 1000000, 0.23, 2024),
  (7, 1000001, 2000000, 0.24, 2024),
  (8, 2000001, 3000000, 0.245, 2024),
  (9, 3000001, 5000000, 0.2475, 2024),
  (10, 5000001, 7000000, 0.25, 2024),
  (11, 7000001, 10000000, 0.25, 2024),
  (12, 10000001, 9999999999.99, 0.25, 2024)
ON CONFLICT (bracket, year) DO NOTHING;

-- 5. Verificar resultado
SELECT * FROM irt_config ORDER BY bracket;
