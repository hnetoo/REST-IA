-- ============================================
-- MIGRAÇÃO SIMPLIFICADA - Eventos e Pacotes
-- Para executar no SQL Editor do Supabase
-- Seguro: verifica existência antes de criar
-- ============================================

-- Desativar avisos para não poluir output
SET client_min_messages TO WARNING;

-- ============================================
-- 1. CRIAR TIPOS ENUM (se não existirem)
-- ============================================
DO $$
BEGIN
    -- eventtype
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventtype') THEN
        CREATE TYPE eventtype AS ENUM (
            'ANIVERSARIO', 'CASAMENTO', 'ALUGUER_TOTAL', 'ALUGUER_PARCIAL', 
            'SHOW_INTIMISTA', 'CORPORATIVO', 'BATIZADO', 'OUTRO'
        );
    END IF;

    -- eventstatus
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventstatus') THEN
        CREATE TYPE eventstatus AS ENUM (
            'PLANEADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'
        );
    END IF;

    -- eventarea
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventarea') THEN
        CREATE TYPE eventarea AS ENUM (
            'SALA_PRINCIPAL', 'TERRACO', 'SALAO_PRIVADO', 'RESTAURANTE_INTEIRO'
        );
    END IF;

    -- consumptiontype
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumptiontype') THEN
        CREATE TYPE consumptiontype AS ENUM (
            'ILIMITADO', 'LIMITADO', 'PACOTE_FECHADO', 'CONSUMO_POS'
        );
    END IF;

    -- eventordertype
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventordertype') THEN
        CREATE TYPE eventordertype AS ENUM (
            'INCLUIDO', 'EXTRA'
        );
    END IF;
END $$;

-- ============================================
-- 2. FUNÇÃO AUXILIAR (updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. TABELA: event_packages
-- ============================================
CREATE TABLE IF NOT EXISTS event_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    event_type eventtype,
    min_guests INTEGER DEFAULT 1,
    max_guests INTEGER DEFAULT 10,
    included_items JSONB DEFAULT '[]'::jsonb,
    base_price DECIMAL(12, 2) DEFAULT 0,
    price_per_person DECIMAL(12, 2) DEFAULT 0,
    allowed_areas TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    duration_hours INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_packages_type ON event_packages(event_type);
CREATE INDEX IF NOT EXISTS idx_event_packages_active ON event_packages(is_active);

DROP TRIGGER IF EXISTS update_event_packages_updated_at ON event_packages;
CREATE TRIGGER update_event_packages_updated_at
    BEFORE UPDATE ON event_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. TABELA: events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type eventtype NOT NULL,
    status eventstatus DEFAULT 'PLANEADO',
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TEXT,
    end_time TEXT,
    area eventarea,
    tables_reserved INTEGER[] DEFAULT '{}',
    guests_count INTEGER DEFAULT 0,
    guests_confirmed INTEGER DEFAULT 0,
    package_id UUID REFERENCES event_packages(id) ON DELETE SET NULL,
    included_items JSONB DEFAULT '[]'::jsonb,
    consumption_mode consumptiontype DEFAULT 'PACOTE_FECHADO',
    base_amount DECIMAL(12, 2) DEFAULT 0,
    extras_amount DECIMAL(12, 2) DEFAULT 0,
    deposit_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    special_requests TEXT,
    assigned_staff UUID[] DEFAULT '{}',
    external_suppliers JSONB DEFAULT '[]'::jsonb,
    schedule JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_package ON events(package_id);

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. TABELA: event_orders
-- ============================================
CREATE TABLE IF NOT EXISTS event_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    order_id UUID UNIQUE NOT NULL,
    order_type eventordertype DEFAULT 'INCLUIDO',
    table_number INTEGER,
    is_unlimited BOOLEAN DEFAULT FALSE,
    unlimited_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_orders_event ON event_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_type ON event_orders(order_type);

DROP TRIGGER IF EXISTS update_event_orders_updated_at ON event_orders;
CREATE TRIGGER update_event_orders_updated_at
    BEFORE UPDATE ON event_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ATUALIZAR TABELA orders (seguro)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'event_id') THEN
        ALTER TABLE orders ADD COLUMN event_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'is_event_order') THEN
        ALTER TABLE orders ADD COLUMN is_event_order BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'event_order_type') THEN
        ALTER TABLE orders ADD COLUMN event_order_type eventordertype;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);

-- ============================================
-- 7. ATUALIZAR TABELA pos_tables (seguro)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_tables' AND column_name = 'event_id') THEN
        ALTER TABLE pos_tables ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_tables' AND column_name = 'event_reserved') THEN
        ALTER TABLE pos_tables ADD COLUMN event_reserved BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_tables_event ON pos_tables(event_id);

-- ============================================
-- 8. RPC FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION increment_event_extras(p_event_id UUID, p_amount DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE events
    SET 
        extras_amount = COALESCE(extras_amount, 0) + p_amount,
        final_amount = COALESCE(base_amount, 0) + COALESCE(extras_amount, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_available_tables_for_date(p_date DATE, p_exclude_event_id UUID DEFAULT NULL)
RETURNS TABLE (table_id INT) AS $$
BEGIN
    RETURN QUERY
    SELECT pt.id
    FROM pos_tables pt
    WHERE pt.id NOT IN (
        SELECT UNNEST(e.tables_reserved)
        FROM events e
        WHERE e.start_date = p_date
            AND e.status NOT IN ('CANCELADO', 'CONCLUIDO')
            AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. RLS (Row Level Security)
-- ============================================
ALTER TABLE IF EXISTS event_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Remover políticas existentes
    DROP POLICY IF EXISTS event_packages_all_policy ON event_packages;
    DROP POLICY IF EXISTS events_all_policy ON events;
    DROP POLICY IF EXISTS event_orders_all_policy ON event_orders;
    
    -- Criar novas políticas
    CREATE POLICY event_packages_all_policy ON event_packages
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    CREATE POLICY events_all_policy ON events
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    CREATE POLICY event_orders_all_policy ON event_orders
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

-- ============================================
-- 10. DADOS INICIAIS (pacotes de exemplo)
-- ============================================
INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
SELECT 
    'Pacote Aniversário Básico',
    'Ideal para aniversários de 10 pessoas. Inclui buffet e bebidas.',
    'ANIVERSARIO',
    5,
    10,
    50000,
    8000,
    3,
    '[{"name": "Buffet de Salgados", "quantity_per_person": 5, "unlimited": false},{"name": "Refrigerante", "quantity_per_person": 2, "unlimited": true},{"name": "Bolo de Aniversário", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
    ARRAY['SALAO_PRIVADO', 'TERRACO']
WHERE NOT EXISTS (SELECT 1 FROM event_packages LIMIT 1);

INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
SELECT 
    'Pacote Aniversário Premium',
    'Aniversário com open bar e buffet completo. Até 20 pessoas.',
    'ANIVERSARIO',
    10,
    20,
    100000,
    12000,
    5,
    '[{"name": "Buffet Completo", "quantity_per_person": 1, "unlimited": true},{"name": "Open Bar", "quantity_per_person": 1, "unlimited": true},{"name": "Bolo Premium", "quantity_per_person": 1, "unlimited": false},{"name": "Decoração", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
    ARRAY['RESTAURANTE_INTEIRO', 'SALAO_PRIVADO']
WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Pacote Aniversário Premium');

INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
SELECT 
    'Aluguer Total - Evento Privado',
    'Aluguer completo do restaurante para eventos privados.',
    'ALUGUER_TOTAL',
    20,
    50,
    200000,
    15000,
    6,
    '[{"name": "Menu Personalizado", "quantity_per_person": 1, "unlimited": false},{"name": "Bebidas", "quantity_per_person": 1, "unlimited": true},{"name": "Som e Luz", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
    ARRAY['RESTAURANTE_INTEIRO']
WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Aluguer Total - Evento Privado');

-- ============================================
-- CONFIRMAÇÃO
-- ============================================
SELECT '✅ Migração concluída com sucesso!' AS status;
