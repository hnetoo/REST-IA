-- Supabase Verification and Rollback Plan

-- Verification Scripts:
-- These queries are designed to verify the integrity and consistency of data after migration.

-- 1. Verify row counts for each migrated table
SELECT 'categories' AS table_name, COUNT(*) FROM public.categories;
SELECT 'dishes' AS table_name, COUNT(*) FROM public.dishes;
SELECT 'orders' AS table_name, COUNT(*) FROM public.orders;
SELECT 'user_profiles' AS table_name, COUNT(*) FROM public.user_profiles;
-- Add more tables as needed

-- 2. Verify referential integrity (e.g., dishes referencing categories)
SELECT d.id, d.name AS dish_name, d.category_id, c.name AS category_name
FROM public.dishes d
LEFT JOIN public.categories c ON d.category_id = c.id
WHERE c.id IS NULL; -- This should return no rows if all dishes have valid categories

-- 3. Verify unique constraints (e.g., unique dish names within a category)
SELECT category_id, name, COUNT(*)
FROM public.dishes
GROUP BY category_id, name
HAVING COUNT(*) > 1; -- This should return no rows if dish names are unique per category

-- 4. Verify data types and content for a sample of rows
-- Example for categories table
SELECT id, name, created_at, updated_at FROM public.categories LIMIT 10;
-- Example for dishes table
SELECT id, name, description, price, category_id, created_at, updated_at FROM public.dishes LIMIT 10;
-- Add more detailed checks as needed for specific data types or formats

-- 5. Verify RLS policies (e.g., check if a non-admin user can only see their own data)
-- This typically requires testing with different user roles/tokens, not just SQL queries.
-- You can check the policy definitions:
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Rollback Plan:
-- These SQL commands are for reverting the changes made by the migration, if necessary.
-- IMPORTANT: Execute these commands with extreme caution and only if a full rollback is required.
-- Ensure you have a backup of your Supabase project before performing a rollback.

-- 1. Drop tables created during migration (in reverse order of creation to handle foreign keys)
-- Uncomment and execute these lines if you need to rollback the schema.
-- DROP TABLE IF EXISTS public.orders;
-- DROP TABLE IF EXISTS public.dishes;
-- DROP TABLE IF EXISTS public.categories;
-- DROP TABLE IF EXISTS public.user_profiles;

-- 2. Drop functions and triggers
-- Uncomment and execute these lines if you need to rollback functions and triggers.
-- DROP TRIGGER IF EXISTS update_categories_timestamp ON public.categories;
-- DROP TRIGGER IF EXISTS update_dishes_timestamp ON public.dishes;
-- DROP TRIGGER IF EXISTS update_orders_timestamp ON public.orders;
-- DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON public.user_profiles;
-- DROP FUNCTION IF EXISTS public.update_timestamp();

-- 3. Remove RLS policies (if any were created specifically for the migration and need to be removed)
-- Uncomment and execute these lines if you need to rollback RLS policies.
-- ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
-- DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.categories;
-- Add similar lines for other tables and policies

-- 4. Clean up any other migration-specific artifacts (e.g., sequences, views, etc.)
-- Add any other specific cleanup commands here.
