-- Migration: Create purchase_requests table
-- Description: Table for managing purchase requests with approval workflow

CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'pago')) DEFAULT 'pendente',
    proforma_url TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own requests
CREATE POLICY "Users can view their own purchase requests" ON purchase_requests
    FOR SELECT USING (auth.uid() = created_by);

-- Create policy for users to insert their own requests
CREATE POLICY "Users can insert their own purchase requests" ON purchase_requests
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Create policy for owners to view all requests
CREATE POLICY "Owners can view all purchase requests" ON purchase_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'owner'
        )
    );

-- Create policy for owners to update requests
CREATE POLICY "Owners can update purchase requests" ON purchase_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'owner'
        )
    );
