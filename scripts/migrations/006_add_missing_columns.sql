-- ============================================
-- MIGRATION: Adicionar colunas faltantes
-- Schema real do Supabase
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
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

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

-- 3. CRIAR TABELA payroll_receipts (FK staff_id = text)
CREATE TABLE IF NOT EXISTS payroll_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
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
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  printed_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_receipts_staff ON payroll_receipts(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_receipts_month ON payroll_receipts(month_year);

-- 4. RLS para irt_config
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

-- 5. VERIFICAR
SELECT 'staff' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staff' AND column_name IN ('nif','admission_date','contract_type','irt_exempt','food_allowance','transport_allowance')
UNION ALL
SELECT 'salary_payments', column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'salary_payments' AND column_name IN ('gross_salary','inss_worker','irt_amount','receipt_number')
ORDER BY tabela, column_name;
