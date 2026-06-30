-- ============================================
-- CRIAR OPERADORES NO SUPABASE
-- Execute no Supabase SQL Editor
-- ============================================

-- Limpar operadores existentes (opcional - descomente se quiser limpar tudo)
-- TRUNCATE public.pos_operators;

-- Inserir operadores
INSERT INTO public.pos_operators (id, name, role, pin, permissions, status, created_at, updated_at)
VALUES 
  ('admin-001', 'Admin', 'ADMIN', '2775', '["POS_ACCESS","POS_SALES","POS_VOID","POS_DISCOUNT","FINANCE_VIEW","STOCK_MANAGE","STAFF_MANAGE","SYSTEM_CONFIG","AGT_CONFIG"]', 'ATIVO', NOW(), NOW()),
  ('caixa-001', 'Operador de Caixa', 'CAIXA', '1234', '["POS_ACCESS","POS_SALES","POS_DISCOUNT"]', 'ATIVO', NOW(), NOW()),
  ('gerente-001', 'Gerente', 'ADMIN', '2775', '["POS_ACCESS","POS_SALES","POS_VOID","POS_DISCOUNT","FINANCE_VIEW","STOCK_MANAGE","STAFF_MANAGE","SYSTEM_CONFIG"]', 'ATIVO', NOW(), NOW()),
  ('cozinha-001', 'Cozinha', 'COZINHA', '2222', '["POS_ACCESS","KITCHEN_VIEW"]', 'ATIVO', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  pin = EXCLUDED.pin,
  permissions = EXCLUDED.permissions,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verificar resultado
SELECT id, name, role, pin, status FROM public.pos_operators ORDER BY name;
