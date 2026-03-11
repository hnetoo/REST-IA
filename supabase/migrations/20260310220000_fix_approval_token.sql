-- Force add approval_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_requests' 
        AND column_name = 'approval_token'
    ) THEN
        ALTER TABLE purchase_requests ADD COLUMN approval_token TEXT;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_purchase_requests_approval_token 
        ON purchase_requests(approval_token);
        
        -- Add unique constraint
        ALTER TABLE purchase_requests 
        ADD CONSTRAINT IF NOT EXISTS unique_approval_token 
        UNIQUE (approval_token);
        
        -- Update existing records with random tokens
        UPDATE purchase_requests 
        SET approval_token = upper(substring(encode(gen_random_bytes(8), 'hex'), 1, 8))
        WHERE approval_token IS NULL;
        
        RAISE NOTICE 'approval_token column added successfully';
    ELSE
        RAISE NOTICE 'approval_token column already exists';
    END IF;
END $$;
