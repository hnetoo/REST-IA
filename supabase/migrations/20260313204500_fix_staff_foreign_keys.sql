-- Migration: Fix Staff Foreign Keys After ID Type Change
-- Description: Drop foreign keys that reference staff.id, change id type, then recreate
-- Created: 2026-03-13 20:45:00

-- 1. Drop foreign key constraints that reference staff.id
DO $$
BEGIN
    -- Drop staff_schedules foreign key if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'staff_schedules_staff_id_fkey' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.staff_schedules DROP CONSTRAINT staff_schedules_staff_id_fkey;
        RAISE NOTICE 'Dropped staff_schedules_staff_id_fkey constraint';
    END IF;
    
    -- Drop any other foreign keys referencing staff.id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_employee_id_fkey' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.attendance DROP CONSTRAINT attendance_employee_id_fkey;
        RAISE NOTICE 'Dropped attendance_employee_id_fkey constraint';
    END IF;
END $$;

-- 2. Convert staff.id to TEXT
ALTER TABLE public.staff ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 3. Convert staff_schedules.staff_id to TEXT to match staff.id
ALTER TABLE public.staff_schedules ALTER COLUMN staff_id TYPE TEXT USING staff_id::TEXT;

-- 4. Convert attendance.employee_id to TEXT to match staff.id (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'attendance' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.attendance ALTER COLUMN employee_id TYPE TEXT USING employee_id::TEXT;
        RAISE NOTICE 'Converted attendance.employee_id to TEXT';
    ELSE
        RAISE NOTICE 'Attendance table does not exist, skipping conversion';
    END IF;
END $$;

-- 5. Add payment_method column to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_method'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'NUMERARIO';
        RAISE NOTICE 'Column payment_method added to orders table';
    ELSE
        RAISE NOTICE 'Column payment_method already exists in orders table';
    END IF;
END $$;

-- 6. Recreate foreign key constraints with TEXT type
DO $$
BEGIN
    -- Recreate staff_schedules foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'staff_schedules' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.staff_schedules 
        ADD CONSTRAINT staff_schedules_staff_id_fkey 
        FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
        RAISE NOTICE 'Recreated staff_schedules_staff_id_fkey constraint';
    END IF;
    
    -- Recreate attendance foreign key (only if table exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'attendance' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.attendance 
        ADD CONSTRAINT attendance_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.staff(id) ON DELETE CASCADE;
        RAISE NOTICE 'Recreated attendance_employee_id_fkey Constraint';
    END IF;
END $$;

-- 7. Verify table structures
DO $$
BEGIN
    RAISE NOTICE 'Staff table id column is now TEXT type';
    RAISE NOTICE 'Staff schedules staff_id column is now TEXT type';
    RAISE NOTICE 'Attendance employee_id column is now TEXT type (if table exists)';
    RAISE NOTICE 'Orders table now has payment_method column';
    RAISE NOTICE 'Foreign key constraints recreated with TEXT type';
    
    -- Show current columns for verification
    RAISE NOTICE 'Staff columns: %', 
        (SELECT array_agg(column_name::text) 
         FROM information_schema.columns 
         WHERE table_name = 'staff' AND table_schema = 'public');
         
    RAISE NOTICE 'Orders columns: %', 
        (SELECT array_agg(column_name::text) 
         FROM information_schema.columns 
         WHERE table_name = 'orders' AND table_schema = 'public');
END $$;
