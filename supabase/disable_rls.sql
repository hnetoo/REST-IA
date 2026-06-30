-- 🔓 DESATIVAR ROW LEVEL SECURITY (RLS) - Permissões para App
-- Execute no SQL Editor do Supabase para resolver erro 401/42501

-- Tabelas principais
ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "staff" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_flow" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "external_history" DISABLE ROW LEVEL SECURITY;

-- Tabelas auxiliares
ALTER TABLE "pos_tables" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "salary_payments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_schedules" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "application_state" DISABLE ROW LEVEL SECURITY;

-- Conceder permissões explícitas
GRANT ALL ON "orders" TO anon, authenticated, service_role;
GRANT ALL ON "order_items" TO anon, authenticated, service_role;
GRANT ALL ON "products" TO anon, authenticated, service_role;
GRANT ALL ON "categories" TO anon, authenticated, service_role;
GRANT ALL ON "staff" TO anon, authenticated, service_role;
GRANT ALL ON "expenses" TO anon, authenticated, service_role;
GRANT ALL ON "cash_flow" TO anon, authenticated, service_role;
GRANT ALL ON "external_history" TO anon, authenticated, service_role;
GRANT ALL ON "pos_tables" TO anon, authenticated, service_role;
GRANT ALL ON "purchase_requests" TO anon, authenticated, service_role;
GRANT ALL ON "salary_payments" TO anon, authenticated, service_role;
GRANT ALL ON "staff_schedules" TO anon, authenticated, service_role;
GRANT ALL ON "application_state" TO anon, authenticated, service_role;

-- Sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ✅ Após executar, faça:
-- 1. Commit no git
-- 2. Build e deploy
-- 3. Teste se o Dashboard carrega sem erro 401
