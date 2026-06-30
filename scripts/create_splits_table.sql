-- Tabela para divisão de pagamentos (Split Payment)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS order_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  customer_name TEXT,
  customer_nif TEXT,
  invoice_number TEXT,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE order_payment_splits ENABLE ROW LEVEL SECURITY;

-- Política: permitir acesso anónimo (mesmo padrão das outras tabelas)
CREATE POLICY "Allow all for anon" ON order_payment_splits
  FOR ALL USING (true) WITH CHECK (true);

-- Índice para buscar splits por order_id
CREATE INDEX IF NOT EXISTS idx_order_payment_splits_order_id ON order_payment_splits(order_id);
