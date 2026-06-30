-- ============================================================
-- TABELAS EM FALTA - TASCA DO VEREDA
-- Execute no Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/tboiuiwlqfzcvakxrsmj/sql
-- ============================================================

-- ============================================================
-- 1. attendance (ponto/faltas de funcionários)
--    Usada em: Reports.tsx, Employees.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id TEXT NOT NULL,
  employee_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  hours_worked NUMERIC(5,2),
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. agt_documents (documentos fiscais AGT)
--    Usada em: useAGT.ts, certificationService.ts, AGTDocumentsTab.tsx, useStore.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS agt_documents (
  id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_status TEXT DEFAULT 'N',
  series_code TEXT,
  document_number TEXT,
  document_date TIMESTAMPTZ,
  tax_registration_number TEXT,
  customer_tax_id TEXT,
  customer_name TEXT,
  customer_country TEXT DEFAULT 'AO',
  hash TEXT,
  lines_json JSONB DEFAULT '[]',
  tax_payable NUMERIC(12,2) DEFAULT 0,
  net_total NUMERIC(12,2) DEFAULT 0,
  gross_total NUMERIC(12,2) DEFAULT 0,
  discount_total NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT,
  source_billing TEXT DEFAULT 'P',
  agt_submission_status TEXT DEFAULT 'PENDING',
  order_id TEXT,
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agt_documents DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. terminal_sync (sincronização de dados entre terminais)
--    Usada em: syncService.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS terminal_sync (
  establishment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  today_revenue NUMERIC(12,2) DEFAULT 0,
  global_revenue NUMERIC(12,2) DEFAULT 0,
  staff_costs NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  open_orders_count INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE terminal_sync DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. pos_active_sessions (sessões POS activas - mesas abertas)
--    Usada em: referenciada no Supabase
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  table_id TEXT,
  table_name TEXT,
  operator_name TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  total_amount NUMERIC(12,2) DEFAULT 0,
  items_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pos_active_sessions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Seed inicial para terminal_sync (requerido pelo syncService)
-- ============================================================
INSERT INTO terminal_sync (establishment_id, today_revenue, global_revenue, staff_costs, total_expenses, open_orders_count)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0, 0, 0)
ON CONFLICT (establishment_id) DO NOTHING;
