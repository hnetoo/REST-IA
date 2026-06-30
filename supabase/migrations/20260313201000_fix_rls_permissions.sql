-- Migration: Fix RLS Permissions - Unlock Critical Tables
-- Description: Disable RLS and grant full permissions for development stage
-- Created: 2026-03-13 20:10:00

-- 1. Libertar tabelas críticas para inserção pública (desenvolvimento)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests DISABLE ROW LEVEL SECURITY;

-- 2. Verificar e libertar tabela users se existir
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 3. Garantir permissões completas para todos os utilizadores
-- Permissões para utilizador anónimo (não autenticado)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Permissões para utilizador autenticado
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Permissões para serviço (service_role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 4. Garantir permissões específicas para tabelas críticas
-- Orders
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;

-- Order Items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;

-- Expenses
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO service_role;

-- Staff
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO service_role;

-- Purchase Requests
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_requests TO service_role;

-- 5. Permissões para tabela users se existir
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
    END IF;
END $$;

-- 6. Garantir permissões nas sequências para auto-incremento
DO $$
DECLARE
    tbl_name TEXT;
    seq_name TEXT;
BEGIN
    FOR tbl_name, seq_name IN 
        SELECT t.table_name, c.column_name || '_seq' as seq_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND c.column_default LIKE 'nextval%'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO anon', seq_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO authenticated', seq_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO service_role', seq_name);
    END LOOP;
END $$;

-- 7. Log de verificação
DO $$
BEGIN
    RAISE NOTICE 'RLS permissions reset completed. Tables are now open for development.';
    RAISE NOTICE 'Critical tables unlocked: orders, order_items, expenses, staff, purchase_requests';
    RAISE NOTICE 'Full permissions granted to: anon, authenticated, service_role';
END $$;
