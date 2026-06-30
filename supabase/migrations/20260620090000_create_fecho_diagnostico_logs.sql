-- =====================================================================
-- Criar tabela de logs de diagnóstico para fecho de caixa
-- Executar no Supabase Dashboard > SQL Editor
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fecho_diagnostico_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  step TEXT NOT NULL,
  data JSONB,
  error JSONB,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fecho_diagnostico_logs OWNER TO postgres;
GRANT ALL ON TABLE public.fecho_diagnostico_logs TO anon;
GRANT ALL ON TABLE public.fecho_diagnostico_logs TO authenticated;
GRANT ALL ON TABLE public.fecho_diagnostico_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_fecho_diagnostico_timestamp 
  ON public.fecho_diagnostico_logs USING btree (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_fecho_diagnostico_step 
  ON public.fecho_diagnostico_logs USING btree (step);
