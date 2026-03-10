-- Add approval_token column to purchase_requests
ALTER TABLE purchase_requests 
ADD COLUMN approval_token TEXT;

-- Create index for faster lookups
CREATE INDEX idx_purchase_requests_approval_token ON purchase_requests(approval_token);

-- Add unique constraint to prevent duplicate tokens
ALTER TABLE purchase_requests 
ADD CONSTRAINT unique_approval_token UNIQUE (approval_token);

-- Function to generate random approval token
CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate 8-character random token
  token := upper(substring(encode(gen_random_bytes(8), 'hex'), 1, 8));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM purchase_requests WHERE approval_token = token) LOOP
    token := upper(substring(encode(gen_random_bytes(8), 'hex'), 1, 8));
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate approval token for new purchases
CREATE OR REPLACE FUNCTION set_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_token IS NULL OR NEW.approval_token = '' THEN
    NEW.approval_token := generate_approval_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_purchase_approval_token
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_approval_token();

-- Update existing records with tokens
UPDATE purchase_requests 
SET approval_token = generate_approval_token() 
WHERE approval_token IS NULL OR approval_token = '';

COMMENT ON COLUMN purchase_requests.approval_token IS 'Token único para aprovação via link público sem login';
