-- SQL para criar tabela financial_history no Supabase
-- Execute este comando no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.financial_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revenue NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    system TEXT,
    period TEXT
);

-- Adicionar comentários à tabela
COMMENT ON TABLE public.financial_history IS 'Histórico financeiro para dashboard do proprietário';

-- Adicionar comentários às colunas
COMMENT ON COLUMN public.financial_history.id IS 'ID único do registro';
COMMENT ON COLUMN public.financial_history.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.financial_history.revenue IS 'Valor total de receitas';
COMMENT ON COLUMN public.financial_history.expenses IS 'Valor total de despesas';
COMMENT ON COLUMN public.financial_history.profit IS 'Valor total de lucro';
COMMENT ON COLUMN public.financial_history.status IS 'Status do registro (ACTIVE/INACTIVE)';
COMMENT ON COLUMN public.financial_history.system IS 'Nome do sistema que gerou o registro';
COMMENT ON COLUMN public.financial_history.period IS 'Período do registro (ex: Jan-Dez 2024)';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_history_created_at ON public.financial_history(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_history_status ON public.financial_history(status);

-- Inserir dados iniciais (opcional - remova se não quiser dados de exemplo)
INSERT INTO public.financial_history (revenue, expenses, profit, system, period, status)
VALUES 
(26500, 4000, 22500, 'REST-IA POS', 'Mar-2025', 'ACTIVE'),
(15000, 2000, 13000, 'REST-IA POS', 'Fev-2025', 'ACTIVE'),
(32000, 5000, 27000, 'REST-IA POS', 'Jan-2025', 'ACTIVE');

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.financial_history ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para leitura pública (ajuste conforme necessário)
CREATE POLICY "Enable read access for all authenticated users" ON public.financial_history
    FOR SELECT USING (auth.role() = 'authenticated');

-- Criar política RLS para inserção (ajuste conforme necessário)
CREATE POLICY "Enable insert for authenticated users" ON public.financial_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
