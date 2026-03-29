
-- Fix Schema Columns
-- Run this in Supabase SQL Editor to ensure all columns exist.

-- Categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

-- Dishes
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS price NUMERIC(12,2);
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS is_visible_digital BOOLEAN DEFAULT TRUE;
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
