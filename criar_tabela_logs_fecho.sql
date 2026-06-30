-- 🔥 CRIAR TABELA DE LOGS PARA DIAGNÓSTICO DO FECHO DE CAIXA
-- Executar no Supabase SQL Editor

-- Criar tabela de logs
CREATE TABLE IF NOT EXISTS public.fecho_diagnostico_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    step TEXT NOT NULL,
    data JSONB,
    error JSONB,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.fecho_diagnostico_logs IS 'Logs de diagnóstico para problemas no fecho de caixa';
COMMENT ON COLUMN public.fecho_diagnostico_logs.step IS 'Etapa do processo (ex: CASH_CLOSING_START, CASHFLOW_INSERT_ERROR)';
COMMENT ON COLUMN public.fecho_diagnostico_logs.data IS 'Dados contextuais em formato JSON';
COMMENT ON COLUMN public.fecho_diagnostico_logs.error IS 'Erro capturado em formato JSON';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fecho_logs_step ON public.fecho_diagnostico_logs(step);
CREATE INDEX IF NOT EXISTS idx_fecho_logs_timestamp ON public.fecho_diagnostico_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fecho_logs_created ON public.fecho_diagnostico_logs(created_at DESC);

-- Permissões (sem RLS para facilitar diagnóstico)
ALTER TABLE public.fecho_diagnostico_logs ENABLE ROW LEVEL SECURITY;

-- Política: todos podem inserir (para logs funcionarem em qualquer contexto)
CREATE POLICY "Allow insert logs" ON public.fecho_diagnostico_logs
    FOR INSERT TO public
    WITH CHECK (true);

-- Política: todos podem ler (para diagnóstico)
CREATE POLICY "Allow select logs" ON public.fecho_diagnostico_logs
    FOR SELECT TO public
    USING (true);

-- Grant permissions
GRANT ALL ON public.fecho_diagnostico_logs TO anon;
GRANT ALL ON public.fecho_diagnostico_logs TO authenticated;
GRANT ALL ON public.fecho_diagnostico_logs TO service_role;

-- Verificar se tabela foi criada
SELECT 'Tabela fecho_diagnostico_logs criada com sucesso!' as status;
