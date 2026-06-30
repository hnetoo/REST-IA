-- ============================================
-- VERIFICAR PERMISSÕES DO ROLE 'anon' NA TABELA pos_operators
-- Execute no Supabase SQL Editor
-- ============================================

-- Verificar permissões do role 'anon' na tabela
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'pos_operators' 
  AND grantee = 'anon';

-- Verificar se a tabela pertence ao schema public e está acessível
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'pos_operators' AND schemaname = 'public';

-- Verificar políticas RLS (se houver)
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'pos_operators' AND schemaname = 'public';

-- Conceder permissões explícitas ao role 'anon' (se necessário)
-- Descomente e execute se as permissões estiverem em falta:
-- GRANT ALL ON public.pos_operators TO anon;
-- GRANT USAGE, SELECT ON SEQUENCE public.pos_operators_id_seq TO anon;
