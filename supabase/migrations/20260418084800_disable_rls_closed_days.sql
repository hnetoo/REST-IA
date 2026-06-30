-- Desativar RLS na tabela closed_days para permitir acesso anônimo
-- Isso resolve o erro 401/42501 ao buscar dias fechados

ALTER TABLE public.closed_days DISABLE ROW LEVEL SECURITY;
