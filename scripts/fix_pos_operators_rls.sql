-- ============================================
-- DESACTIVAR RLS na tabela pos_operators
-- Execute isto no Supabase SQL Editor
-- ============================================

-- Desactivar completamente o Row Level Security
-- ⚠️ Isto permite que qualquer pessoa com a chave anónima aceda à tabela
ALTER TABLE public.pos_operators DISABLE ROW LEVEL SECURITY;

-- Confirmar que RLS está desactivado
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'pos_operators';
