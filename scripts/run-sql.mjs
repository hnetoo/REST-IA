import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const KEY = SERVICE_KEY || ANON_KEY;
const h = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

// Tentar criar via RPC exec_sql
async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ sql })
  });
  return { status: res.status, body: await res.text() };
}

// Criar cada tabela individualmente
const statements = [
  // attendance
  `CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id TEXT NOT NULL,
    employee_name TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    hours_worked NUMERIC(5,2),
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE attendance DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON attendance TO anon, authenticated`,

  // agt_documents
  `CREATE TABLE IF NOT EXISTS agt_documents (
    id TEXT PRIMARY KEY,
    document_type TEXT NOT NULL,
    document_status TEXT DEFAULT 'N',
    series_code TEXT,
    document_number TEXT,
    document_date TIMESTAMPTZ,
    tax_registration_number TEXT,
    customer_tax_id TEXT,
    customer_name TEXT,
    customer_country TEXT DEFAULT 'AO',
    hash TEXT,
    lines_json JSONB DEFAULT '[]',
    tax_payable NUMERIC(12,2) DEFAULT 0,
    net_total NUMERIC(12,2) DEFAULT 0,
    gross_total NUMERIC(12,2) DEFAULT 0,
    discount_total NUMERIC(12,2) DEFAULT 0,
    payment_method TEXT,
    source_billing TEXT DEFAULT 'P',
    agt_submission_status TEXT DEFAULT 'PENDING',
    order_id TEXT,
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE agt_documents DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON agt_documents TO anon, authenticated`,

  // terminal_sync
  `CREATE TABLE IF NOT EXISTS terminal_sync (
    establishment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    today_revenue NUMERIC(12,2) DEFAULT 0,
    global_revenue NUMERIC(12,2) DEFAULT 0,
    staff_costs NUMERIC(12,2) DEFAULT 0,
    total_expenses NUMERIC(12,2) DEFAULT 0,
    open_orders_count INTEGER DEFAULT 0,
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE terminal_sync DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON terminal_sync TO anon, authenticated`,
  `INSERT INTO terminal_sync (establishment_id, today_revenue, global_revenue, staff_costs, total_expenses, open_orders_count)
   VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0, 0, 0)
   ON CONFLICT (establishment_id) DO NOTHING`,

  // pos_active_sessions
  `ALTER TABLE pos_active_sessions DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_active_sessions TO anon, authenticated`,
];

console.log('=== CRIAR TABELAS EM FALTA ===\n');

for (const sql of statements) {
  const tableName = sql.match(/TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1] || 
                    sql.match(/TABLE\s+(\w+)/i)?.[1] ||
                    sql.slice(0, 40).trim();
  const result = await execSQL(sql);
  if (result.status === 200 || result.status === 204) {
    console.log(`✅ OK: ${tableName}`);
  } else {
    console.log(`❌ ERRO (${result.status}): ${tableName}`);
    console.log(`   ${result.body.slice(0, 120)}`);
  }
}

// Verificar resultado final
console.log('\n=== VERIFICAÇÃO FINAL ===');
for (const t of ['attendance', 'agt_documents', 'terminal_sync', 'pos_active_sessions']) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=0`, {
    headers: { ...h, 'Prefer': 'count=exact' }
  });
  const count = res.headers.get('content-range')?.split('/')[1] ?? '?';
  console.log(`${t}: ${res.status === 200 ? `✅ EXISTE (${count} registos)` : `❌ FALHOU (${res.status})`}`);
}
