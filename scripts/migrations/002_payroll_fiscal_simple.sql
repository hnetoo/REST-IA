-- ============================================
-- MIGRATION: Capital Humano Fiscal — Angola
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. NOVAS COLUNAS NA TABELA staff
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS nif VARCHAR(20),
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'INDEFINIDO',
  ADD COLUMN IF NOT EXISTS irt_exempt BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_calculate_tax BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS food_allowance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_work_hours INT DEFAULT 8,
  ADD COLUMN IF NOT EXISTS work_days_per_month INT DEFAULT 22,
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#06b6d4',
  ADD COLUMN IF NOT EXISTS external_bio_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. NOVAS COLUNAS NA TABELA salary_payments
ALTER TABLE salary_payments
  ADD COLUMN IF NOT EXISTS gross_salary NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inss_worker NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inss_employer NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS irt_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_income NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS irt_bracket INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS irt_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS receipt_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'TRANSFERENCIA';

-- 3. NOVA TABELA: irt_config (tabela progressiva editavel)
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

-- Indice unico por escalao e ano
CREATE UNIQUE INDEX IF NOT EXISTS idx_irt_config_bracket_year
  ON irt_config(bracket, year) WHERE is_active = TRUE;

-- 4. POPULAR TABELA IRT COM ESCALOES ANGOLA 2024
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

-- 5. NOVA TABELA: payroll_receipts (historico de recibos)
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
CREATE INDEX IF NOT EXISTS idx_payroll_receipts_number ON payroll_receipts(receipt_number);

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
-- VERIFICACAO: Confirme que as colunas foram criadas
-- ============================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'staff' ORDER BY column_name;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'salary_payments' ORDER BY column_name;
