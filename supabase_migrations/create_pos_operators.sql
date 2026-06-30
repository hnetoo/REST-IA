-- Tabela para gestão de operadores POS (separada de staff/funcionários)
-- Utilizada pelo card "Controlo de Acesso" no menu Sistema
CREATE TABLE IF NOT EXISTS pos_operators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'GARCOM',
  pin TEXT NOT NULL,
  permissions JSONB DEFAULT '["POS_SALES"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para login por PIN (performance)
CREATE INDEX IF NOT EXISTS idx_pos_operators_pin ON pos_operators(pin);

-- Índice para filtro por status
CREATE INDEX IF NOT EXISTS idx_pos_operators_status ON pos_operators(status);

-- Desactivar RLS para esta tabela (acesso via anon key)
ALTER TABLE pos_operators ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todas as operações (app confia no cliente)
CREATE POLICY "Allow all operations on pos_operators" ON pos_operators
  FOR ALL USING (true) WITH CHECK (true);
