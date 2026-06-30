-- ============================================
-- DESACTIVAR RLS NA TABELA pos_operators - FORÇADO
-- Execute isto no Supabase SQL Editor como ADMIN
-- ============================================

-- 1. Desactivar RLS completamente
ALTER TABLE IF EXISTS public.pos_operators DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'pos_operators' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pos_operators', pol.policyname);
        RAISE NOTICE 'Política % removida', pol.policyname;
    END LOOP;
END $$;

-- 3. Confirmar estado
SELECT 
    c.relname as tabela,
    c.relrowsecurity as rls_ativo,
    c.relforcerowsecurity as rls_forcado,
    COUNT(p.policyname) as num_politicas
FROM pg_class c
LEFT JOIN pg_policies p ON c.relname = p.tablename
WHERE c.relname = 'pos_operators'
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity;
