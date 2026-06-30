-- SUPABASE CLI MIGRATION - AGT Tables (SEM RLS)
-- Data: Maio 2026

-- 1. TABELAS DE BACKUP (SEM RLS)
CREATE TABLE IF NOT EXISTS _backup_orders_structure_pre_agt (
  column_name VARCHAR(128),
  data_type VARCHAR(128),
  character_maximum_length INTEGER,
  numeric_precision INTEGER,
  numeric_scale INTEGER,
  column_default TEXT,
  is_nullable VARCHAR(3),
  ordinal_position INTEGER
);

COMMENT ON TABLE _backup_orders_structure_pre_agt IS 'Backup da estrutura da tabela orders antes da migration AGT';

INSERT INTO _backup_orders_structure_pre_agt
SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, column_default::text, is_nullable, ordinal_position
FROM information_schema.columns WHERE table_name = 'orders' AND table_schema = 'public';

CREATE TABLE IF NOT EXISTS _backup_orders_data_pre_agt AS SELECT * FROM orders;

COMMENT ON TABLE _backup_orders_data_pre_agt IS 'Backup completo dos dados da tabela orders antes da migration AGT';

CREATE TABLE IF NOT EXISTS _migration_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(100),
  action VARCHAR(50),
  status VARCHAR(20),
  executed_at TIMESTAMP DEFAULT NOW(),
  details TEXT
);

ALTER TABLE _backup_orders_structure_pre_agt DISABLE ROW LEVEL SECURITY;
ALTER TABLE _backup_orders_data_pre_agt DISABLE ROW LEVEL SECURITY;
ALTER TABLE _migration_log DISABLE ROW LEVEL SECURITY;

-- 2. EXTENSÃO DA TABELA ORDERS (Colunas AGT)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS document_type VARCHAR(2) DEFAULT 'FT';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS document_status VARCHAR(1) DEFAULT 'N';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eac_code VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_tax_id VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_country VARCHAR(2) DEFAULT 'AO';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agt_submission_uuid VARCHAR(36);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agt_request_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agt_status VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agt_submitted_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agt_validated_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS jws_document_signature TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deductible_vat_percentage DECIMAL(5,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS non_deductible_amount DECIMAL(15,2);

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 3. TABELAS AUXILIARES AGT (SEM RLS)
CREATE TABLE IF NOT EXISTS agt_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_code VARCHAR(20) NOT NULL,
  series_year INTEGER NOT NULL,
  document_type VARCHAR(2) NOT NULL,
  establishment_number VARCHAR(10) NOT NULL DEFAULT '001',
  authorized_quantity INTEGER NOT NULL,
  first_document_no VARCHAR(50) NOT NULL,
  last_document_no VARCHAR(50) NOT NULL,
  current_sequence INTEGER DEFAULT 0,
  status VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'U', 'F')),
  agt_registration_code VARCHAR(50),
  agt_registered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(series_code, series_year, document_type),
  CHECK (authorized_quantity > 0),
  CHECK (current_sequence <= authorized_quantity)
);

COMMENT ON TABLE agt_series IS 'Séries de faturação autorizadas pela AGT';
ALTER TABLE agt_series DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS agt_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50) UNIQUE NOT NULL,
  submission_uuid VARCHAR(36) NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  document_no VARCHAR(50) NOT NULL,
  document_type VARCHAR(2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  result_code INTEGER,
  action_result_code VARCHAR(10),
  submitted_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  response_data JSONB,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE agt_submissions IS 'Tracking de submissões à AGT';
ALTER TABLE agt_submissions DISABLE ROW LEVEL SECURITY;

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_orders_agt_status ON orders(agt_status) WHERE agt_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_document_type ON orders(document_type);
CREATE INDEX IF NOT EXISTS idx_orders_agt_submitted_at ON orders(agt_submitted_at) WHERE agt_submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_tax_id ON orders(customer_tax_id) WHERE customer_tax_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_agt_request_id ON orders(agt_request_id) WHERE agt_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agt_series_code_year ON agt_series(series_code, series_year);
CREATE INDEX IF NOT EXISTS idx_agt_series_document_type ON agt_series(document_type);
CREATE INDEX IF NOT EXISTS idx_agt_series_status ON agt_series(status) WHERE status = 'U';
CREATE INDEX IF NOT EXISTS idx_agt_submissions_request ON agt_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_agt_submissions_order ON agt_submissions(order_id);
CREATE INDEX IF NOT EXISTS idx_agt_submissions_status ON agt_submissions(status);
CREATE INDEX IF NOT EXISTS idx_agt_submissions_document ON agt_submissions(document_no);
CREATE INDEX IF NOT EXISTS idx_agt_submissions_pending ON agt_submissions(status) WHERE status IN ('PENDING', 'PROCESSING');

-- 5. DADOS INICIAIS
INSERT INTO agt_series (series_code, series_year, document_type, establishment_number, authorized_quantity, first_document_no, last_document_no, current_sequence, status) VALUES 
('A', 2025, 'FT', '001', 1000, 'FT 2025/1', 'FT 2025/1000', 0, 'A'),
('B', 2025, 'FR', '001', 1000, 'FR 2025/1', 'FR 2025/1000', 0, 'A')
ON CONFLICT (series_code, series_year, document_type) DO NOTHING;

-- 6. LOG
INSERT INTO _migration_log (migration_name, action, status, details) VALUES ('AGT_Fase_2_e_4_CLI', 'EXECUTE', 'COMPLETED', 'Migration AGT executada via CLI - RLS DESABILITADO');