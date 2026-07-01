/**
 * Schema PostgreSQL para inicializacao automatica no Supabase.
 * Usado na primeira configuracao (SetupModal) — copiar e colar no SQL Editor do Supabase.
 */

export const schemaStatements: string[] = [

  // ── CATEGORIAS ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE categories DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON categories TO anon, authenticated`,

  // ── PRODUTOS ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    category_id TEXT REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'un',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE products DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON products TO anon, authenticated`,

  // ── FUNCIONÁRIOS ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    base_salary_kz NUMERIC DEFAULT 0,
    salario_base NUMERIC DEFAULT 0,
    subsidios NUMERIC DEFAULT 0,
    bonus NUMERIC DEFAULT 0,
    horas_extras NUMERIC DEFAULT 0,
    descontos NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE staff DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON staff TO anon, authenticated`,

  // ── MESAS ───────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    number INTEGER NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'LIVRE',
    capacity INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE tables DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON tables TO anon, authenticated`,

  // ── CLIENTES ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    nif TEXT,
    points INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE customers DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON customers TO anon, authenticated`,

  // ── PEDIDOS ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id),
    customer_id TEXT REFERENCES customers(id),
    status TEXT DEFAULT 'OPEN',
    payment_method TEXT,
    total NUMERIC DEFAULT 0,
    notes TEXT,
    items JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
  )`,
  `ALTER TABLE orders DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON orders TO anon, authenticated`,

  // ── ITENS DE PEDIDO ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE order_items DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON order_items TO anon, authenticated`,

  // ── DESPESAS / CASH FLOW ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE expenses DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON expenses TO anon, authenticated`,

  `CREATE TABLE IF NOT EXISTS cash_flow (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE cash_flow DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON cash_flow TO anon, authenticated`,

  // ── CONFIGURAÇÕES ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    restaurant_name TEXT DEFAULT 'Restaurante',
    currency TEXT DEFAULT 'AOA',
    tax_rate NUMERIC DEFAULT 0.14,
    nif TEXT,
    address TEXT,
    phone TEXT,
    logo_url TEXT,
    digital_menu_url TEXT,
    supabase_url TEXT,
    supabase_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE settings DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON settings TO anon, authenticated`,

  // ── OPERADORES POS ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pos_operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'GARCOM',
    pin TEXT NOT NULL,
    permissions JSONB DEFAULT '[]',
    status TEXT DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE pos_operators DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_operators TO anon, authenticated`,

  // ── TURNOS ──────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pos_shift_records (
    id TEXT PRIMARY KEY,
    shift_type TEXT NOT NULL,
    opened_by TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_by TEXT,
    closed_at TIMESTAMPTZ,
    opening_amount NUMERIC DEFAULT 0,
    closing_amount NUMERIC DEFAULT 0,
    expected_amount NUMERIC DEFAULT 0,
    total_sales NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE pos_shift_records DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_shift_records TO anon, authenticated`,

  // ── SESSÕES ACTIVAS POS ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pos_active_sessions (
    id TEXT PRIMARY KEY,
    operator_id TEXT,
    shift_id TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE pos_active_sessions DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_active_sessions TO anon, authenticated`,

  // ── ASSIDUIDADE ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES staff(id),
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'present',
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE attendance DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON attendance TO anon, authenticated`,

  // ── DOCUMENTOS AGT ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS agt_documents (
    id TEXT PRIMARY KEY,
    document_type TEXT,
    document_status TEXT DEFAULT 'N',
    series_code TEXT,
    document_number TEXT,
    document_date DATE,
    tax_registration_number TEXT,
    customer_tax_id TEXT,
    customer_name TEXT,
    customer_country TEXT DEFAULT 'AO',
    hash TEXT,
    lines_json TEXT,
    tax_payable NUMERIC DEFAULT 0,
    net_total NUMERIC DEFAULT 0,
    gross_total NUMERIC DEFAULT 0,
    discount_total NUMERIC DEFAULT 0,
    payment_method TEXT,
    source_billing TEXT DEFAULT 'P',
    agt_submission_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE agt_documents DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON agt_documents TO anon, authenticated`,

  // ── SYNC TERMINAL ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS terminal_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID UNIQUE DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    today_revenue NUMERIC DEFAULT 0,
    global_revenue NUMERIC DEFAULT 0,
    staff_costs NUMERIC DEFAULT 0,
    total_expenses NUMERIC DEFAULT 0,
    open_orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE terminal_sync DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON terminal_sync TO anon, authenticated`,
  `INSERT INTO terminal_sync (establishment_id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (establishment_id) DO NOTHING`,

  // ── HISTÓRICO EXTERNO ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS external_history (
    id TEXT PRIMARY KEY,
    type TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE external_history DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON external_history TO anon, authenticated`,

  // ── SEED: categorias padrão ─────────────────────────────────────────────────
  `INSERT INTO categories (id, name) VALUES
    ('cat-1', 'Entradas'),
    ('cat-2', 'Pratos Principais'),
    ('cat-3', 'Acompanhamentos'),
    ('cat-4', 'Bebidas'),
    ('cat-5', 'Sobremesas'),
    ('cat-6', 'Outros')
  ON CONFLICT (id) DO NOTHING`,

  // ── SEED: mesas padrão ──────────────────────────────────────────────────────
  `INSERT INTO tables (number, status) VALUES
    (1,'LIVRE'),(2,'LIVRE'),(3,'LIVRE'),(4,'LIVRE'),(5,'LIVRE'),
    (6,'LIVRE'),(7,'LIVRE'),(8,'LIVRE'),(9,'LIVRE'),(10,'LIVRE')
  ON CONFLICT DO NOTHING`,

  // ── SEED: configuração padrão ───────────────────────────────────────────────
  `INSERT INTO settings (id, restaurant_name, currency, tax_rate)
   VALUES ('main', 'O Meu Restaurante', 'AOA', 0.14)
   ON CONFLICT (id) DO NOTHING`,
];

// SQL completo em string única — para copiar no SQL Editor do Supabase
export const schemaSQL: string = schemaStatements.join(';\n\n') + ';';
