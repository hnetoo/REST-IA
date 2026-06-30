-- ============================================
-- MIGRAÇÃO: Eventos e Pacotes
-- Cria tabelas sem afetar dados existentes
-- ============================================

-- ============================================
-- ENUMS (como tipos de texto com CHECK constraints)
-- ============================================

-- Criar tipos de evento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventtype') THEN
        CREATE TYPE eventtype AS ENUM (
            'ANIVERSARIO', 'CASAMENTO', 'ALUGUER_TOTAL', 'ALUGUER_PARCIAL', 
            'SHOW_INTIMISTA', 'CORPORATIVO', 'BATIZADO', 'OUTRO'
        );
    END IF;
END $$;

-- Criar status de evento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventstatus') THEN
        CREATE TYPE eventstatus AS ENUM (
            'PLANEADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'
        );
    END IF;
END $$;

-- Criar áreas de evento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventarea') THEN
        CREATE TYPE eventarea AS ENUM (
            'SALA_PRINCIPAL', 'TERRACO', 'SALAO_PRIVADO', 'RESTAURANTE_INTEIRO'
        );
    END IF;
END $$;

-- Criar tipos de consumo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumptiontype') THEN
        CREATE TYPE consumptiontype AS ENUM (
            'ILIMITADO', 'LIMITADO', 'PACOTE_FECHADO', 'CONSUMO_POS'
        );
    END IF;
END $$;

-- Criar tipos de pedido de evento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventordertype') THEN
        CREATE TYPE eventordertype AS ENUM (
            'INCLUIDO', 'EXTRA'
        );
    END IF;
END $$;

-- ============================================
-- TABELA: event_packages (Pacotes de Evento)
-- ============================================

CREATE TABLE IF NOT EXISTS event_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    event_type eventtype,
    
    -- Configuração de pessoas
    min_guests INTEGER DEFAULT 1,
    max_guests INTEGER DEFAULT 10,
    
    -- Itens incluídos no pacote (JSONB)
    included_items JSONB DEFAULT '[]'::jsonb,
    
    -- Preços
    base_price DECIMAL(12, 2) DEFAULT 0,
    price_per_person DECIMAL(12, 2) DEFAULT 0,
    
    -- Áreas permitidas
    allowed_areas TEXT[] DEFAULT '{}',
    
    -- Configuração
    is_active BOOLEAN DEFAULT TRUE,
    duration_hours INTEGER DEFAULT 4,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para event_packages
CREATE INDEX IF NOT EXISTS idx_event_packages_type ON event_packages(event_type);
CREATE INDEX IF NOT EXISTS idx_event_packages_active ON event_packages(is_active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_packages_updated_at ON event_packages;
CREATE TRIGGER update_event_packages_updated_at
    BEFORE UPDATE ON event_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: events (Eventos)
-- ============================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Informações básicas
    name TEXT NOT NULL,
    type eventtype NOT NULL,
    status eventstatus DEFAULT 'PLANEADO',
    
    -- Responsável/Cliente
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    
    -- Datas e horários
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TEXT,
    end_time TEXT,
    
    -- Localização
    area eventarea,
    tables_reserved INTEGER[] DEFAULT '{}',
    
    -- Convidados
    guests_count INTEGER DEFAULT 0,
    guests_confirmed INTEGER DEFAULT 0,
    
    -- Pacote associado
    package_id UUID REFERENCES event_packages(id) ON DELETE SET NULL,
    
    -- Itens do pacote personalizados para este evento
    included_items JSONB DEFAULT '[]'::jsonb,
    
    -- Configuração de consumo
    consumption_mode consumptiontype DEFAULT 'PACOTE_FECHADO',
    
    -- Valores financeiros
    base_amount DECIMAL(12, 2) DEFAULT 0,
    extras_amount DECIMAL(12, 2) DEFAULT 0,
    deposit_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Notas
    notes TEXT,
    special_requests TEXT,
    
    -- Equipa
    assigned_staff UUID[] DEFAULT '{}',
    
    -- Fornecedores externos
    external_suppliers JSONB DEFAULT '[]'::jsonb,
    
    -- Cronograma
    schedule JSONB DEFAULT '[]'::jsonb,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_package ON events(package_id);

-- Trigger para updated_at (drop if exists para evitar erro)
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA: event_orders (Pedidos de Eventos)
-- ============================================

CREATE TABLE IF NOT EXISTS event_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ligação ao evento
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Ligação ao pedido original (orders)
    order_id UUID UNIQUE NOT NULL,
    
    -- Configuração
    order_type eventordertype DEFAULT 'INCLUIDO',
    table_number INTEGER,
    
    -- Se for item ilimitado do pacote
    is_unlimited BOOLEAN DEFAULT FALSE,
    unlimited_type TEXT,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para event_orders
CREATE INDEX IF NOT EXISTS idx_event_orders_event ON event_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_type ON event_orders(order_type);

-- Trigger para updated_at (drop if exists para evitar erro)
DROP TRIGGER IF EXISTS update_event_orders_updated_at ON event_orders;
CREATE TRIGGER update_event_orders_updated_at
    BEFORE UPDATE ON event_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ATUALIZAÇÃO TABELA EXISTENTE: orders
-- Adicionar colunas para linkar com eventos
-- ============================================

-- Verificar se as colunas existem antes de adicionar
DO $$
BEGIN
    -- Adicionar event_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'event_id') THEN
        ALTER TABLE orders ADD COLUMN event_id UUID;
    END IF;
    
    -- Adicionar is_event_order
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'is_event_order') THEN
        ALTER TABLE orders ADD COLUMN is_event_order BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adicionar event_order_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'event_order_type') THEN
        ALTER TABLE orders ADD COLUMN event_order_type eventordertype;
    END IF;
END $$;

-- Índice para event_id em orders
CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);

-- ============================================
-- ATUALIZAÇÃO TABELA EXISTENTE: pos_tables
-- Adicionar colunas para reservas de eventos
-- ============================================

DO $$
BEGIN
    -- Adicionar event_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_tables' AND column_name = 'event_id') THEN
        ALTER TABLE pos_tables ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
    END IF;
    
    -- Adicionar event_reserved
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pos_tables' AND column_name = 'event_reserved') THEN
        ALTER TABLE pos_tables ADD COLUMN event_reserved BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Índice para event_id em pos_tables
CREATE INDEX IF NOT EXISTS idx_pos_tables_event ON pos_tables(event_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Opcional
-- ============================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE event_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir tudo para authenticated)
CREATE POLICY IF NOT EXISTS event_packages_all_policy ON event_packages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
CREATE POLICY IF NOT EXISTS events_all_policy ON events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
CREATE POLICY IF NOT EXISTS event_orders_all_policy ON event_orders
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- DADOS INICIAIS DE EXEMPLO (Opcional)
-- ============================================

-- Inserir pacotes de exemplo (se a tabela estiver vazia)
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
    '[
        {"product_id": null, "name": "Buffet de Salgados", "quantity_per_person": 5, "unlimited": false},
        {"product_id": null, "name": "Refrigerante", "quantity_per_person": 2, "unlimited": true},
        {"product_id": null, "name": "Bolo de Aniversário", "quantity_per_person": 1, "unlimited": false}
    ]'::jsonb,
    '{"SALAO_PRIVADO", "TERRACO"}'
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
    '[
        {"product_id": null, "name": "Buffet Completo", "quantity_per_person": 1, "unlimited": true},
        {"product_id": null, "name": "Open Bar", "quantity_per_person": 1, "unlimited": true},
        {"product_id": null, "name": "Bolo Premium", "quantity_per_person": 1, "unlimited": false},
        {"product_id": null, "name": "Decoração", "quantity_per_person": 1, "unlimited": false}
    ]'::jsonb,
    '{"RESTAURANTE_INTEIRO", "SALAO_PRIVADO"}'
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
    '[
        {"product_id": null, "name": "Menu Personalizado", "quantity_per_person": 1, "unlimited": false},
        {"product_id": null, "name": "Bebidas", "quantity_per_person": 1, "unlimited": true},
        {"product_id": null, "name": "Som e Luz", "quantity_per_person": 1, "unlimited": false}
    ]'::jsonb,
    '{"RESTAURANTE_INTEIRO"}'
WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Aluguer Total - Evento Privado');

-- ============================================
-- CONFIRMAÇÃO
-- ============================================
SELECT 'Migração concluída com sucesso!' AS status;
