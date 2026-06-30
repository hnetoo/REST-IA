-- 🔑 CRIAR TABELA app_settings SE NÃO EXISTIR
-- Esta tabela armazena configurações globais incluindo taxas de imposto

-- Verificar se a tabela existe e criar se não existir
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão se não existirem
INSERT INTO public.app_settings (id, data) 
VALUES (
  'global_settings',
  JSONB_BUILD_OBJECT(
    'taxRate', 0.14,
    'currency', 'AOA',
    'timezone', 'Africa/Luanda',
    'businessName', 'Tasca do Vereda',
    'taxEnabled', true,
    'dateFormat', 'DD/MM/YYYY',
    'lastUpdated', NOW()
  )
) ON CONFLICT (id) DO NOTHING;

-- Inserir taxas de imposto se não existirem
INSERT INTO public.app_settings (id, data)
VALUES (
  'tax_rates',
  JSONB_BUILD_OBJECT(
    'iva', 0.14,
    'iss', 0.00,
    'other_taxes', 0.00,
    'total_tax_rate', 0.14,
    'effective_date', '2024-01-01'
  )
) ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir leituras públicas (settings são públicos)
CREATE POLICY "Public read access to app_settings" ON public.app_settings
  FOR SELECT USING (true);

-- Política para permitir atualizações apenas a usuários autenticados
CREATE POLICY "Authenticated users can update app_settings" ON public.app_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir inserções apenas a usuários autenticados
CREATE POLICY "Authenticated users can insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_app_settings_id ON public.app_settings(id);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON public.app_settings(updated_at);

-- Comentários
COMMENT ON TABLE public.app_settings IS 'Configurações globais da aplicação incluindo taxas de imposto e configurações de negócio';
COMMENT ON COLUMN public.app_settings.id IS 'Identificador único da configuração';
COMMENT ON COLUMN public.app_settings.data IS 'Dados JSON da configuração';
