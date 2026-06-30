-- Criar tabela para histórico externo de dados
CREATE TABLE IF NOT EXISTS external_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  gross_profit NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados reais dos sistemas antigos
INSERT INTO external_history (source_name, total_revenue, gross_profit, period) VALUES
('Sistema POS Antigo', 45000000, 8500000, '2023-2024'),
('Excel Manual', 22000000, 4200000, '2023-2024'),
('Papel e Caneta', 18000000, 3500000, '2023-2024')
ON CONFLICT (id) DO NOTHING;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_external_history_source ON external_history(source_name);
CREATE INDEX IF NOT EXISTS idx_external_history_period ON external_history(period);

-- Habilitar RLS (Row Level Security)
ALTER TABLE external_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura
CREATE POLICY "Allow read access" ON external_history
  FOR SELECT USING (true);

-- Política para permitir inserção (se necessário)
CREATE POLICY "Allow insert" ON external_history
  FOR INSERT WITH CHECK (true);
