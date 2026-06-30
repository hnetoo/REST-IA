-- ============================================
-- VERIFICAR ESTADO RLS DA TABELA pos_operators
-- Execute no Supabase SQL Editor
-- ============================================

-- Mostrar estado RLS da tabela
SELECT 
    schemaname,
    tablename,
    CASE WHEN relrowsecurity THEN 'RLS ATIVADO (com políticas)' 
         WHEN relforcerowsecurity THEN 'RLS FORÇADO' 
         ELSE 'RLS DESATIVADO' END as rls_status,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename = 'pos_operators' AND t.schemaname = 'public';

-- Mostrar políticas existentes (se houver)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'pos_operators' AND schemaname = 'public';

-- Contar registos na tabela
SELECT COUNT(*) as total_records FROM public.pos_operators;
