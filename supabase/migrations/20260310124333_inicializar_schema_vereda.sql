-- Migration: Inicializar Schema Vereda
-- Description: Schema completo da aplicação Vereda OS
-- Includes: Identity & Config, HR (RH), Stock & Menu (QR Menu), Purchases & Approval

-- TABELAS DE IDENTIDADE E CONFIGURAÇÃO
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_name TEXT DEFAULT 'Tasca do Vereda',
    logo_url TEXT,
    currency TEXT DEFAULT 'Kz',
    is_qr_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABELAS DE CAPITAL HUMANO (RH)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role TEXT,
    base_salary_kz DECIMAL(12,2) DEFAULT 0,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    shift_start TIME,
    shift_end TIME,
    work_days TEXT[], -- Array de dias da semana
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELAS DE STOCK E MENU (QR MENU)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_kz DECIMAL(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    is_visible_qr BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE COMPRAS E APROVAÇÃO
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount_kz DECIMAL(12,2) NOT NULL,
    provider TEXT,
    status TEXT DEFAULT 'pendente', -- pendente, aprovado, rejeitado, pago
    proforma_url TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELAS DE FINANÇAS (VENDAS)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id TEXT,
    status TEXT DEFAULT 'open', -- open, closed, cancelled
    total_amount_kz DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    unit_price_kz DECIMAL(12,2) DEFAULT 0,
    total_price_kz DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELAS DE CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON public.staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON public.purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON public.purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- App Settings - Acesso público para leitura
CREATE POLICY "Public can read app settings" ON public.app_settings
    FOR SELECT USING (true);

-- Staff - Acesso baseado em permissões
CREATE POLICY "Users can view staff" ON public.staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'owner')
        )
    );

CREATE POLICY "Admins can manage staff" ON public.staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'owner')
        )
    );

-- Categories - Acesso baseado em permissões
CREATE POLICY "Users can read categories" ON public.categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner'))
        )
    );

-- Products - Acesso baseado em permissões
CREATE POLICY "Users can read products" ON public.products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner'))
        )
    );

-- Purchase Requests - Acesso baseado em permissões
CREATE POLICY "Users can manage purchase requests" ON public.purchase_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager'))
        )
    );

-- Orders - Acesso baseado em permissões
CREATE POLICY "Users can read orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

CREATE POLICY "Users can manage orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

-- Order Items - Herda permissões de orders
CREATE POLICY "Users can manage order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

-- Customers - Acesso baseado em permissões
CREATE POLICY "Users can read customers" ON public.customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

CREATE POLICY "Users can manage customers" ON public.customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager', 'cashier'))
        )
    );

-- Staff Schedules - Herda permissões de staff
CREATE POLICY "Users can manage staff schedules" ON public.staff_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'owner', 'manager'))
        )
    );