-- ============================================================
-- GESTÃO DE STOCK AVANÇADA — Schema SQL
-- REST IA OS v1.1.2 — Tasca do Vereda
-- ============================================================

-- Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nif TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Compras a fornecedores
CREATE TABLE IF NOT EXISTS stock_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Itens de compra
CREATE TABLE IF NOT EXISTS stock_purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES stock_purchases(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  expiry_date DATE,
  lot_number TEXT
);

-- Inventário físico (contagem)
CREATE TABLE IF NOT EXISTS stock_inventories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'OPEN',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do inventário físico
CREATE TABLE IF NOT EXISTS stock_inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES stock_inventories(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  system_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  counted_quantity NUMERIC(10,2),
  difference NUMERIC(10,2) DEFAULT 0,
  notes TEXT
);

-- Alertas de stock configuráveis
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT,
  alert_type TEXT NOT NULL,
  threshold NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_purchases_supplier ON stock_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_purchases_status ON stock_purchases(status);
CREATE INDEX IF NOT EXISTS idx_stock_purchase_items_purchase ON stock_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_stock_inventory_items_inventory ON stock_inventory_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_type ON stock_alerts(alert_type);

-- ============================================================
-- RLS POLICIES — Necessário para Supabase (RLS activado por defeito)
-- ============================================================

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Stock Purchases
ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_purchases_all" ON stock_purchases FOR ALL USING (true) WITH CHECK (true);

-- Stock Purchase Items
ALTER TABLE stock_purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_purchase_items_all" ON stock_purchase_items FOR ALL USING (true) WITH CHECK (true);

-- Stock Inventories
ALTER TABLE stock_inventories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_inventories_all" ON stock_inventories FOR ALL USING (true) WITH CHECK (true);

-- Stock Inventory Items
ALTER TABLE stock_inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_inventory_items_all" ON stock_inventory_items FOR ALL USING (true) WITH CHECK (true);

-- Stock Alerts
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_alerts_all" ON stock_alerts FOR ALL USING (true) WITH CHECK (true);

-- Stock Movements (se existir)
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL USING (true) WITH CHECK (true);
