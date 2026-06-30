-- Migration: Fix Orders ID Type to Accept Text
-- Description: Convert orders.id from UUID to TEXT to accept 'ord-' prefixes
-- Created: 2026-03-13 21:00:00

-- 1. Drop foreign key constraints that reference orders.id
DO $$
BEGIN
    -- Drop order_items foreign key if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_order_id_fkey' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.order_items DROP CONSTRAINT order_items_order_id_fkey;
        RAISE NOTICE 'Dropped order_items_order_id_fkey constraint';
    END IF;
END $$;

-- 2. Convert orders.id to TEXT to accept 'ord-' prefixes
ALTER TABLE public.orders ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 3. Convert order_items.order_id to TEXT to match orders.id
ALTER TABLE public.order_items ALTER COLUMN order_id TYPE TEXT USING order_id::TEXT;

-- 4. Recreate foreign key constraints with TEXT type
DO $$
BEGIN
    -- Recreate order_items foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'order_items' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.order_items 
        ADD CONSTRAINT order_items_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
        RAISE NOTICE 'Recreated order_items_order_id_fkey constraint';
    END IF;
END $$;

-- 5. Verify table structures
DO $$
BEGIN
    RAISE NOTICE 'Orders table id column is now TEXT type';
    RAISE NOTICE 'Order items order_id column is now TEXT type';
    RAISE NOTICE 'Orders can now accept "ord-" prefixes';
    
    -- Show current columns for verification
    RAISE NOTICE 'Orders columns: %', 
        (SELECT array_agg(column_name::text) 
         FROM information_schema.columns 
         WHERE table_name = 'orders' AND table_schema = 'public');
         
    RAISE NOTICE 'Order items columns: %', 
        (SELECT array_agg(column_name::text) 
         FROM information_schema.columns 
         WHERE table_name = 'order_items' AND table_schema = 'public');
END $$;
