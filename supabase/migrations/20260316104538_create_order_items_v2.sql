-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_order_items_order' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items 
          ADD CONSTRAINT fk_order_items_order 
          FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_order_items_product' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items 
          ADD CONSTRAINT fk_order_items_product 
          FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON public.order_items(created_at);

-- Add RLS policies
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read order items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND policyname = 'Authenticated users can view order items'
    ) THEN
        CREATE POLICY "Authenticated users can view order items" ON public.order_items
          FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Policy to allow authenticated users to insert order items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND policyname = 'Authenticated users can insert order items'
    ) THEN
        CREATE POLICY "Authenticated users can insert order items" ON public.order_items
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Policy to allow authenticated users to update order items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND policyname = 'Authenticated users can update order items'
    ) THEN
        CREATE POLICY "Authenticated users can update order items" ON public.order_items
          FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Policy to allow authenticated users to delete order items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND policyname = 'Authenticated users can delete order items'
    ) THEN
        CREATE POLICY "Authenticated users can delete order items" ON public.order_items
          FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create trigger to update updated_at timestamp (only if function doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS update_order_items_updated_at ON public.order_items;
CREATE TRIGGER update_order_items_updated_at 
  BEFORE UPDATE ON public.order_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();