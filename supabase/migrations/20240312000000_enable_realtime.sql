-- Enable Realtime for critical tables
-- Execute this in Supabase SQL Editor

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE "orders";
ALTER PUBLICATION supabase_realtime ADD TABLE "order_items"; 
ALTER PUBLICATION supabase_realtime ADD TABLE "products";
ALTER PUBLICATION supabase_realtime ADD TABLE "categories";

-- Verify tables were added
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Grant necessary permissions for Realtime
GRANT SELECT ON "orders" TO authenticated;
GRANT SELECT ON "order_items" TO authenticated;
GRANT SELECT ON "products" TO authenticated;
GRANT SELECT ON "categories" TO authenticated;

-- Enable RLS for public access
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON "products" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "categories" FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON "orders" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "orders" FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON "order_items" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "order_items" FOR SELECT USING (true);
