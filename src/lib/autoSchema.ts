/**
 * Schema SQL para inicializacao automatica do banco Supabase (PostgreSQL).
 * Usado na primeira configuracao (SetupModal) para novo cliente.
 * Cada instrucao e executada individualmente via RPC exec_sql.
 */

// Lista de instrucoes SQL individuais para criar todas as tabelas no Supabase
export const schemaStatements: string[] = [
  // categories
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE categories DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON categories TO anon, authenticated`,

  // products
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    category_id TEXT REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE products DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON products TO anon, authenticated`,

  // staff
  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT,
    base_salary_kz NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'ATIVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE staff DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON staff TO anon, authenticated`,

  // tables
  `CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    number INTEGER NOT NULL UNIQUE,
    name TEXT,
    status TEXT DEFAULT 'LIVRE',
    x NUMERIC DEFAULT 0,
    y NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE tables DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON tables TO anon, authenticated`,

  // customers
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE customers DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON customers TO anon, authenticated`,

  // orders
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_nif TEXT,
    customer_phone TEXT,
    table_id TEXT,
    table_number INTEGER,
    total_amount NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'open',
    payment_method TEXT,
    invoice_number TEXT,
    shift_id TEXT,
    operator_name TEXT,
    items JSONB DEFAULT '[]',
    closed_at TIMESTAMPTZ,
    closed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE orders DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON orders TO anon, authenticated`,

  // order_items
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE order_items DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON order_items TO anon, authenticated`,

  // expenses
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount_kz NUMERIC(12,2) DEFAULT 0,
    category TEXT,
    description TEXT,
    status TEXT DEFAULT 'PENDENTE',
    provider TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE expenses DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON expenses TO anon, authenticated`,

  // cash_flow
  `CREATE TABLE IF NOT EXISTS cash_flow (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    category TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE cash_flow DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON cash_flow TO anon, authenticated`,

  // settings
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    restaurant_name TEXT DEFAULT 'Restaurante',
    currency TEXT DEFAULT 'AOA',
    tax_rate NUMERIC(5,4) DEFAULT 0.14,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE settings DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON settings TO anon, authenticated`,
  `INSERT INTO settings (id, restaurant_name, currency, tax_rate) VALUES ('main', 'Restaurante', 'AOA', 0.14) ON CONFLICT (id) DO NOTHING`,

  // pos_operators
  `CREATE TABLE IF NOT EXISTS pos_operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE pos_operators DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_operators TO anon, authenticated`,

  // pos_shift_records
  `CREATE TABLE IF NOT EXISTS pos_shift_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_type TEXT NOT NULL,
    opened_by TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    opening_amount NUMERIC(12,2) DEFAULT 0,
    closed_by TEXT,
    closed_at TIMESTAMPTZ,
    closing_amount NUMERIC(12,2),
    expected_amount NUMERIC(12,2),
    status TEXT DEFAULT 'OPEN',
    data_contabil DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE pos_shift_records DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_shift_records TO anon, authenticated`,

  // pos_active_sessions
  `CREATE TABLE IF NOT EXISTS pos_active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL,
    table_id TEXT,
    table_name TEXT,
    operator_name TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    total_amount NUMERIC(12,2) DEFAULT 0,
    items_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE pos_active_sessions DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON pos_active_sessions TO anon, authenticated`,

  // attendance
  `CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id TEXT NOT NULL,
    employee_name TEXT,
    date DATE DEFAULT CURRENT_DATE,
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
  `INSERT INTO terminal_sync (establishment_id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (establishment_id) DO NOTHING`,

  // external_history
  `CREATE TABLE IF NOT EXISTS external_history (
    id TEXT PRIMARY KEY,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    gross_profit NUMERIC(12,2) DEFAULT 0,
    source_name TEXT,
    period TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE external_history DISABLE ROW LEVEL SECURITY`,
  `GRANT ALL ON external_history TO anon, authenticated`,

  // Seed: categorias padrão
  `INSERT INTO categories (id, name) VALUES
    ('cat-1', 'Entradas'),
    ('cat-2', 'Pratos Principais'),
    ('cat-3', 'Acompanhamentos'),
    ('cat-4', 'Bebidas'),
    ('cat-5', 'Sobremesas'),
    ('cat-6', 'Outros')
  ON CONFLICT (id) DO NOTHING`,

  // Seed: mesas padrão
  `INSERT INTO tables (id, number, name, status) VALUES
    ('table-1', 1, 'Mesa 1', 'LIVRE'),
    ('table-2', 2, 'Mesa 2', 'LIVRE'),
    ('table-3', 3, 'Mesa 3', 'LIVRE'),
    ('table-4', 4, 'Mesa 4', 'LIVRE'),
    ('table-5', 5, 'Mesa 5', 'LIVRE'),
    ('table-6', 6, 'Mesa 6', 'LIVRE'),
    ('table-7', 7, 'Mesa 7', 'LIVRE'),
    ('table-8', 8, 'Mesa 8', 'LIVRE'),
    ('table-9', 9, 'Mesa 9', 'LIVRE'),
    ('table-10', 10, 'Mesa 10', 'LIVRE')
  ON CONFLICT (id) DO NOTHING`,
];

// Compatibilidade: schemaSQL mantido para não quebrar imports existentes
export const schemaSQL = schemaStatements.join(';\n');
