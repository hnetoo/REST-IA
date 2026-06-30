-- Migração: Adicionar coluna customer_nif à tabela orders
-- Data: 2026-03-30
-- Descrição: Adiciona campo opcional para NIF do cliente nas ordens

-- Adicionar coluna customer_nif se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_nif'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_nif TEXT;
        
        -- Comentário para documentação
        COMMENT ON COLUMN orders.customer_nif IS 'NIF do cliente (opcional)';
        
        RAISE NOTICE 'Coluna customer_nif adicionada com sucesso à tabela orders';
    ELSE
        RAISE NOTICE 'Coluna customer_nif já existe na tabela orders';
    END IF;
END $$;

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'customer_nif';
