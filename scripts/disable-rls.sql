-- DESATIVAR RLS EM TODAS AS TABELAS DO SCHEMA PUBLIC
-- Execute no SQL Editor do Supabase ou via CLI: supabase db execute --file scripts/disable-rls.sql

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
        RAISE NOTICE 'RLS desativado para tabela: %', r.tablename;
    END LOOP;
END $$;
