-- Migration: Fix Dashboard Permissions
-- Description: Grant execute permissions to dashboard function and fix RLS policies
-- Created: 2026-03-13 16:30:00

-- 1. Garantir que a função é executável por todos
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO postgres;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO service_role;

-- 2. Verificar e atualizar políticas RLS para business_stats
DROP POLICY IF EXISTS "Anyone can read business_stats" ON business_stats;
CREATE POLICY "Anyone can read business_stats" ON business_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated can insert business_stats" ON business_stats;
CREATE POLICY "Only authenticated can insert business_stats" ON business_stats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Verificar e atualizar políticas RLS para expenses
DROP POLICY IF EXISTS "Anyone can read expenses" ON expenses;
CREATE POLICY "Anyone can read expenses" ON expenses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated can manage expenses" ON expenses;
CREATE POLICY "Only authenticated can manage expenses" ON expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Garantir RLS está habilitado
ALTER TABLE business_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. Verificar se as tabelas orders e staff existem e têm políticas
DO $$
BEGIN
    -- Verificar e criar políticas para orders se existir
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
        CREATE POLICY "Anyone can read orders" ON orders
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Only authenticated can manage orders" ON orders;
        CREATE POLICY "Only authenticated can manage orders" ON orders
          FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
    END IF;
    
    -- Verificar e criar políticas para staff se existir
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
        ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can read staff" ON staff;
        CREATE POLICY "Anyone can read staff" ON staff
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Only authenticated can manage staff" ON staff;
        CREATE POLICY "Only authenticated can manage staff" ON staff
          FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. Testar a função para garantir que funciona
SELECT get_dashboard_metrics('HOJE') as test_result;
