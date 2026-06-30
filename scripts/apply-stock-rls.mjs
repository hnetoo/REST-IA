import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const statements = [
  `ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "suppliers_all" ON suppliers`,
  `CREATE POLICY "suppliers_all" ON suppliers FOR ALL USING (true) WITH CHECK (true)`,
  
  `ALTER TABLE stock_purchases ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stock_purchases_all" ON stock_purchases`,
  `CREATE POLICY "stock_purchases_all" ON stock_purchases FOR ALL USING (true) WITH CHECK (true)`,
  
  `ALTER TABLE stock_purchase_items ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stock_purchase_items_all" ON stock_purchase_items`,
  `CREATE POLICY "stock_purchase_items_all" ON stock_purchase_items FOR ALL USING (true) WITH CHECK (true)`,
  
  `ALTER TABLE stock_inventories ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stock_inventories_all" ON stock_inventories`,
  `CREATE POLICY "stock_inventories_all" ON stock_inventories FOR ALL USING (true) WITH CHECK (true)`,
  
  `ALTER TABLE stock_inventory_items ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stock_inventory_items_all" ON stock_inventory_items`,
  `CREATE POLICY "stock_inventory_items_all" ON stock_inventory_items FOR ALL USING (true) WITH CHECK (true)`,
  
  `ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stock_alerts_all" ON stock_alerts`,
  `CREATE POLICY "stock_alerts_all" ON stock_alerts FOR ALL USING (true) WITH CHECK (true)`,
  
  `ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "stock_movements_all" ON stock_movements`,
  `CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL USING (true) WITH CHECK (true)`,
];

async function run() {
  console.log('🔧 Aplicando RLS policies statement por statement...\n');
  let ok = 0, fail = 0;
  for (const sql of statements) {
    const label = sql.substring(0, 70);
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.log(`❌ ${label}... → ${error.message}`);
      fail++;
    } else {
      console.log(`✅ ${label}...`);
      ok++;
    }
  }
  console.log(`\n📊 Resultado: ${ok} OK, ${fail} falhas`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
