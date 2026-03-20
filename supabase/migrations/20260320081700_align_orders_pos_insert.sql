-- Migration: Align orders + POS com schema Supabase (Supabase CLI)
-- Fix: vendas do POS não gravam na tabela orders

-- 1. Adicionar user_id à tabela orders (app envia este campo opcionalmente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN user_id UUID;
    RAISE NOTICE 'Coluna user_id adicionada à tabela orders';
  END IF;
END $$;

-- 2. Vista dishes como alias de products (app usa dishes para menu)
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
