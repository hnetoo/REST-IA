-- ============================================
--  SUPABASE STRUCTURE SCRIPT
--  Estrutura principal de tabelas e constraints
-- ============================================

-- --------------------------------------------
--  Tabela: application_state
--  Armazena snapshot JSON completo do estado da aplicação
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------
--  Tabela: categories
--  Categorias do menu digital
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para pesquisas rápidas por visibilidade
CREATE INDEX IF NOT EXISTS idx_categories_visible
ON public.categories (visible);

-- --------------------------------------------
--  Tabela: dishes
--  Pratos do menu digital
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.dishes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    is_visible_digital BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance em filtros comuns
CREATE INDEX IF NOT EXISTS idx_dishes_category
ON public.dishes (category_id);

CREATE INDEX IF NOT EXISTS idx_dishes_visible
ON public.dishes (is_visible_digital);

-- --------------------------------------------
--  Tabela: orders
--  Pedidos POS sincronizados para analytics/realtime
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    table_id INTEGER,
    status TEXT NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_table_status
ON public.orders (table_id, status);

-- --------------------------------------------
--  Tabela: user_profiles
--  Perfis de utilizador ligados ao Supabase Auth
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    legacy_user_id TEXT,
    full_name TEXT,
    role TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_legacy_user_id
ON public.user_profiles (legacy_user_id);

-- --------------------------------------------
--  Publicação Realtime
--  Garante que as tabelas são emitidas para o Realtime
-- --------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dishes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- --------------------------------------------
--  Secção opcional de DROP (comentada)
--  Use apenas em rollbacks controlados
-- --------------------------------------------
-- DROP TABLE IF EXISTS public.orders;
-- DROP TABLE IF EXISTS public.dishes;
-- DROP TABLE IF EXISTS public.categories;
-- DROP TABLE IF EXISTS public.application_state;
-- DROP TABLE IF EXISTS public.user_profiles;

-- --------------------------------------------
--  Função para atualizar a coluna 'updated_at'
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
--  Triggers para atualizar 'updated_at' automaticamente
-- --------------------------------------------

-- Trigger para a tabela categories
CREATE OR REPLACE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Trigger para a tabela dishes
CREATE OR REPLACE TRIGGER trg_dishes_updated_at
BEFORE UPDATE ON public.dishes
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Trigger para a tabela orders
CREATE OR REPLACE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Trigger para a tabela user_profiles
CREATE OR REPLACE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();


