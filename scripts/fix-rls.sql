-- RLS fix - apenas tabelas que ainda nao tem politica
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_purchases_all" ON stock_purchases;
CREATE POLICY "stock_purchases_all" ON stock_purchases FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_purchase_items_all" ON stock_purchase_items;
CREATE POLICY "stock_purchase_items_all" ON stock_purchase_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_inventories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_inventories_all" ON stock_inventories;
CREATE POLICY "stock_inventories_all" ON stock_inventories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_inventory_items_all" ON stock_inventory_items;
CREATE POLICY "stock_inventory_items_all" ON stock_inventory_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_alerts_all" ON stock_alerts;
CREATE POLICY "stock_alerts_all" ON stock_alerts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_movements_all" ON stock_movements;
CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL USING (true) WITH CHECK (true);
