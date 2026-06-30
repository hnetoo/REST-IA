-- ============================================
-- SQL COMPLETO: Criar + Popular irt_config
-- Execute TUDO de uma vez no SQL Editor
-- ============================================

-- 1. CRIAR TABELA (se nao existir)
CREATE TABLE IF NOT EXISTS irt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket INT NOT NULL,
  min_amount NUMERIC(12,2) NOT NULL,
  max_amount NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL,
  year INT NOT NULL DEFAULT 2024,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADICIONAR CONSTRAINT UNIQUE (essencial para ON CONFLICT)
ALTER TABLE irt_config 
  DROP CONSTRAINT IF EXISTS irt_config_bracket_year_unique;

ALTER TABLE irt_config 
  ADD CONSTRAINT irt_config_bracket_year_unique 
  UNIQUE (bracket, year);

-- 3. LIMPAR DADOS ANTIGOS (se houver)
TRUNCATE TABLE irt_config;

-- 4. INSERIR ESCALOES IRT ANGOLA 2024
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

-- 5. CRIAR payroll_receipts (se nao existir)
CREATE TABLE IF NOT EXISTS payroll_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  salary_payment_id UUID REFERENCES salary_payments(id) ON DELETE SET NULL,
  month_year VARCHAR(7) NOT NULL,
  receipt_number VARCHAR(50) NOT NULL,
  gross_salary NUMERIC(12,2) NOT NULL,
  total_subsidies NUMERIC(12,2) DEFAULT 0,
  inss_worker NUMERIC(12,2) DEFAULT 0,
  inss_employer NUMERIC(12,2) DEFAULT 0,
  irt_amount NUMERIC(12,2) DEFAULT 0,
  irt_bracket INT DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL,
  receipt_hash VARCHAR(64),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_receipts_staff ON payroll_receipts(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_receipts_month ON payroll_receipts(month_year);

-- 6. RLS para irt_config
ALTER TABLE irt_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'irt_config' AND policyname = 'Allow all irt_config'
  ) THEN
    CREATE POLICY "Allow all irt_config" ON irt_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ============================================
-- VERIFICACAO: deve mostrar 12 linhas
-- ============================================
SELECT * FROM irt_config ORDER BY bracket;
