-- Migration: Reload Schema Cache
-- Description: Force PostgREST to reload schema definitions
-- Created: 2026-03-13 20:30:00

-- Limpar cache do PostgREST para recarregar definições do schema
NOTIFY pgrst, 'reload schema';

-- Log de verificação
DO $$
BEGIN
    RAISE NOTICE 'PostgREST schema cache reload triggered. Schema definitions will be refreshed.';
END $$;
