-- Create salary_payments table for payroll processing history
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: "03-2026"
  base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_subsidies DECIMAL(12,2) NOT NULL DEFAULT 0,
  overtime_bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_discounts DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSED, PAID
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_salary_payments_staff_id ON salary_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_month_year ON salary_payments(month_year);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON salary_payments(status);

-- Add RLS policies
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all salary payments
CREATE POLICY "Users can view salary payments" ON salary_payments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Users can insert salary payments
CREATE POLICY "Users can insert salary payments" ON salary_payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update salary payments
CREATE POLICY "Users can update salary payments" ON salary_payments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Users can delete salary payments
CREATE POLICY "Users can delete salary payments" ON salary_payments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON salary_payments
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Add unique constraint to prevent duplicate payments for same staff and month
ALTER TABLE salary_payments ADD CONSTRAINT unique_staff_month_year 
  UNIQUE (staff_id, month_year);