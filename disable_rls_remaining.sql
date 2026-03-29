-- Desativar RLS nas tabelas restantes
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules DISABLE ROW LEVEL SECURITY;

-- Ativar Realtime nas tabelas restantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_schedules;

-- Verificar status final
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar todas as publicações Realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
