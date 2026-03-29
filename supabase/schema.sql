-- Schema do Tasca do Vereda REST IA
-- Sistema de Gestão para Restaurantes

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'CAIXA', 'GARCOM', 'COZINHA', 'OWNER')),
    pin VARCHAR(4) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    template_id UUID REFERENCES app_users(id),
    status VARCHAR(20) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de templates de permissão
CREATE TABLE IF NOT EXISTS permission_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mesas
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    seats INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) DEFAULT 'LIVRE' CHECK (status IN ('LIVRE', 'OCUPADO', 'RESERVADO', 'PAGAMENTO')),
    x INTEGER DEFAULT 0,
    y INTEGER DEFAULT 0,
    zone VARCHAR(20) DEFAULT 'INTERIOR' CHECK (zone IN ('INTERIOR', 'EXTERIOR', 'BALCAO')),
    shape VARCHAR(10) DEFAULT 'SQUARE' CHECK (shape IN ('SQUARE', 'ROUND')),
    rotation INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias do menu
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100) DEFAULT 'Utensils',
    is_visible_digital BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pratos
CREATE TABLE IF NOT EXISTS dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
    description TEXT,
    image VARCHAR(500),
    tax_code VARCHAR(50),
    is_visible_digital BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    nif VARCHAR(50),
    points INTEGER DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0.00,
    visits INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO', 'CANCELADO', 'PENDENTE_ENTREGA')),
    type VARCHAR(20) DEFAULT 'LOCAL' CHECK (type IN ('LOCAL', 'ENCOMENDA', 'TAKEAWAY')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total DECIMAL(10,2) DEFAULT 0.00,
    tax_total DECIMAL(10,2) DEFAULT 0.00,
    profit DECIMAL(10,2) DEFAULT 0.00,
    sub_account_name VARCHAR(255),
    customer_id UUID REFERENCES customers(id),
    invoice_number VARCHAR(100),
    hash VARCHAR(100),
    payment_method VARCHAR(50) CHECK (payment_method IN ('NUMERARIO', 'TPA', 'TRANSFERENCIA', 'QR_CODE', 'PAGAR_DEPOIS')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'CAIXA', 'GARCOM', 'COZINHA', 'OWNER')),
    phone VARCHAR(50),
    salary DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
    color VARCHAR(20) DEFAULT '#3B82F6',
    work_days_per_month INTEGER DEFAULT 22,
    daily_work_hours DECIMAL(4,2) DEFAULT 8.0,
    external_bio_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de registros de ponto
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de estoque
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'un',
    min_threshold DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de reservas
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    people INTEGER NOT NULL DEFAULT 2,
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'CANCELADA')),
    table_id INTEGER REFERENCES tables(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de turnos de trabalho
CREATE TABLE IF NOT EXISTS work_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id),
    user_name VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    module VARCHAR(50) CHECK (module IN ('POS', 'TABLES', 'FINANCE', 'SYSTEM')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações de pagamento
CREATE TABLE IF NOT EXISTS payment_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    type VARCHAR(50) NOT NULL CHECK (type IN ('NUMERARIO', 'TPA', 'TRANSFERENCIA', 'QR_CODE')),
    is_active BOOLEAN DEFAULT true,
    requires_reference BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de estado da aplicação (para sincronização)
CREATE TABLE IF NOT EXISTS application_state (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current_state',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp);
CREATE INDEX IF NOT EXISTS idx_dishes_category_id ON dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_templates_updated_at BEFORE UPDATE ON permission_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON dishes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_shifts_updated_at BEFORE UPDATE ON work_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_configs_updated_at BEFORE UPDATE ON payment_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_state_updated_at BEFORE UPDATE ON application_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_state ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir tudo para usuários autenticados)
CREATE POLICY "Enable all operations for authenticated users" ON app_users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON permission_templates FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON tables FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON menu_categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON dishes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON customers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON employees FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON attendance_records FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON stock_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON reservations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON work_shifts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON audit_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON payment_configs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON application_state FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Política pública para leitura de categorias e pratos (menu digital)
CREATE POLICY "Enable read for all users" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Enable read for all users" ON dishes FOR SELECT USING (is_visible_digital = true);

-- Inserir dados iniciais
INSERT INTO permission_templates (id, name, description, permissions) VALUES
('tp-waiter', 'Perfil Garçom', 'Permissões básicas para atendimento de mesas.', ARRAY['POS_SALES']),
('tp-cashier', 'Perfil Caixa', 'Acesso a vendas e descontos.', ARRAY['POS_SALES', 'POS_DISCOUNT']),
('tp-manager', 'Perfil Gerente', 'Acesso total operativo e financeiro.', ARRAY['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE']),
('tp-owner', 'Perfil Proprietário', 'Controlo total e acesso ao Owner Hub.', ARRAY['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'])
ON CONFLICT (id) DO NOTHING;

-- Inserir usuário proprietário padrão
INSERT INTO app_users (id, name, role, pin, permissions, status) VALUES
('00000000-0000-0000-0000-000000000001', 'Proprietário', 'OWNER', '0000', ARRAY['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'], 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- Inserir configurações de pagamento padrão
INSERT INTO payment_configs (id, name, icon, type, is_active) VALUES
('pay-1', 'Numerário', 'Banknote', 'NUMERARIO', true),
('pay-2', 'TPA / Multicaixa', 'CreditCard', 'TPA', true),
('pay-3', 'Transferência', 'ArrowRightLeft', 'TRANSFERENCIA', true),
('pay-4', 'Referência QR', 'QrCode', 'QR_CODE', true)
ON CONFLICT DO NOTHING;
