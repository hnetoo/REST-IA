-- Migration: Alinhamento completo com schema Supabase
-- App 100% Supabase - pos_tables, dishes view, user_id, categories icon

-- 1. Vista dishes (alias de products para compatibilidade)
CREATE OR REPLACE VIEW public.dishes AS
SELECT
  id,
  name,
  COALESCE(price, 0)::numeric as price,
  COALESCE(cost_price, 0)::numeric as cost_price,
  category_id,
  COALESCE(description, '') as description,
  image_url as image,
  COALESCE(is_active, true) as is_visible_digital,
  false as is_featured
FROM public.products;

GRANT SELECT ON public.dishes TO anon;
GRANT SELECT ON public.dishes TO authenticated;

-- 2. Tabela pos_tables (mesas para POS)
CREATE TABLE IF NOT EXISTS public.pos_tables (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Mesa',
  seats INTEGER DEFAULT 4,
  status TEXT DEFAULT 'LIVRE' CHECK (status IN ('LIVRE', 'OCUPADO', 'RESERVADO', 'PAGAMENTO')),
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  zone TEXT DEFAULT 'INTERIOR' CHECK (zone IN ('INTERIOR', 'EXTERIOR', 'BALCAO')),
  shape TEXT DEFAULT 'SQUARE' CHECK (shape IN ('SQUARE', 'ROUND')),
  rotation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir 6 mesas padrão se vazio
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.pos_tables) = 0 THEN
    INSERT INTO public.pos_tables (name, seats, status, x, y, zone, shape, rotation)
    VALUES
      ('Mesa 1', 4, 'LIVRE', 0, 0, 'INTERIOR', 'SQUARE', 0),
      ('Mesa 2', 4, 'LIVRE', 150, 0, 'INTERIOR', 'SQUARE', 0),
      ('Mesa 3', 4, 'LIVRE', 300, 0, 'INTERIOR', 'SQUARE', 0),
      ('Mesa 4', 4, 'LIVRE', 0, 100, 'INTERIOR', 'SQUARE', 0),
      ('Mesa 5', 4, 'LIVRE', 150, 100, 'INTERIOR', 'SQUARE', 0),
      ('Mesa 6', 4, 'LIVRE', 300, 100, 'INTERIOR', 'SQUARE', 0);
  END IF;
END $$;

GRANT ALL ON public.pos_tables TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE pos_tables_id_seq TO anon, authenticated;

-- 3. user_id em orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN user_id UUID;
  END IF;
END $$;

-- 4. categories: icon e is_visible_digital
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'icon') THEN
    ALTER TABLE public.categories ADD COLUMN icon TEXT DEFAULT 'Utensils';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'is_visible_digital') THEN
    ALTER TABLE public.categories ADD COLUMN is_visible_digital BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 5. customers: balance, points, visits, last_visit se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'balance') THEN
    ALTER TABLE public.customers ADD COLUMN balance NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'points') THEN
    ALTER TABLE public.customers ADD COLUMN points INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'visits') THEN
    ALTER TABLE public.customers ADD COLUMN visits INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_visit') THEN
    ALTER TABLE public.customers ADD COLUMN last_visit TIMESTAMPTZ;
  END IF;
END $$;
