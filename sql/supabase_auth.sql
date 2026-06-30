-- ============================================
--  SUPABASE AUTH & RLS SCRIPT
--  Configuração de autenticação e políticas
-- ============================================

-- --------------------------------------------
--  Função auxiliar: extrai role do JWT
--  Assumimos claim customizada 'role' no JWT
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', 'GUEST');
$$;

-- --------------------------------------------
--  Tabela: user_profiles (já criada em supabase_structure.sql)
--  Certificar RLS e políticas de acesso
-- --------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: cada utilizador só vê/edita o próprio perfil
CREATE POLICY IF NOT EXISTS "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Política: OWNER/ADMIN podem ver todos os perfis
CREATE POLICY IF NOT EXISTS "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  public.current_app_role() IN ('OWNER', 'ADMIN')
);

-- --------------------------------------------
--  RLS: categories
--  Menu digital é público (apenas leitura)
-- --------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read categories"
ON public.categories
FOR SELECT
USING (true);

-- Escrita apenas por OWNER/ADMIN
CREATE POLICY IF NOT EXISTS "Admins manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.current_app_role() IN ('OWNER', 'ADMIN'));

-- --------------------------------------------
--  RLS: dishes
--  Menu digital é público (apenas leitura)
-- --------------------------------------------
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read dishes"
ON public.dishes
FOR SELECT
USING (is_visible_digital = TRUE);

-- Escrita apenas por OWNER/ADMIN ou STAFF com permissão STOCK_MANAGE
CREATE POLICY IF NOT EXISTS "Admins manage dishes"
ON public.dishes
FOR ALL
TO authenticated
USING (public.current_app_role() IN ('OWNER', 'ADMIN', 'STOCK_MANAGER'));

-- --------------------------------------------
--  RLS: orders
--  Apenas funções autenticadas podem ver/criar pedidos
-- --------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- OWNER/ADMIN podem atualizar e apagar pedidos
CREATE POLICY IF NOT EXISTS "Admins manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.current_app_role() IN ('OWNER', 'ADMIN'));

-- --------------------------------------------
--  RLS: application_state
--  Apenas serviço/owner podem ler e escrever
-- --------------------------------------------
ALTER TABLE public.application_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Service role manages application state"
ON public.application_state
FOR ALL
USING (public.current_app_role() IN ('OWNER'));

-- --------------------------------------------
--  Secção opcional de DROP (comentada)
-- --------------------------------------------
-- DROP FUNCTION IF EXISTS public.current_app_role();

