-- SQL COMPLETO PARA CRIAR TODAS AS TABELAS NECESSÁRIAS NO SUPABASE
-- Execute este script no Supabase SQL Editor

-- 1. TABELA CASH_FLOW (já deve existir via Prisma)
-- Se não existir, criar:
CREATE TABLE IF NOT EXISTS cash_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(20) DEFAULT 'entrada', -- 'entrada' ou 'saida'
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA EXPENSES (já deve existir via Prisma)
-- Se não existir, criar:
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(255) NOT NULL,
    amount_kz DECIMAL(15,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pago',
    category_name VARCHAR(100)
);

-- 3. TABELA EXTERNAL_HISTORY (já deve existir via Prisma)
-- Se não existir, criar:
CREATE TABLE IF NOT EXISTS external_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(255) NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    gross_profit DECIMAL(15,2) DEFAULT 0,
    period VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA STAFF (já deve existir via Prisma)
-- Se não existir, criar:
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    base_salary_kz DECIMAL(12,2) DEFAULT 0,
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    subsidios DECIMAL(15,2) DEFAULT 0,
    bonus DECIMAL(15,2) DEFAULT 0,
    horas_extras DECIMAL(15,2) DEFAULT 0,
    descontos DECIMAL(15,2) DEFAULT 0,
    salario_base DECIMAL(15,2) DEFAULT 0
);

-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_cash_flow_created_at ON cash_flow(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flow_type ON cash_flow(type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_category ON cash_flow(category);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

CREATE INDEX IF NOT EXISTS idx_external_history_period ON external_history(period);
CREATE INDEX IF NOT EXISTS idx_external_history_source ON external_history(source_name);

CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- 6. DADOS DE TESTE - CASH_FLOW
INSERT INTO cash_flow (id, amount, type, category, description, created_at, updated_at) VALUES
    (gen_random_uuid(), 25000, 'saida', 'Material de Escritório', 'Papel, canetas, impressora', CURRENT_DATE, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 15000, 'saida', 'Limpeza e Manutenção', 'Serviços de limpeza mensal', CURRENT_DATE, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 35000, 'saida', 'Utilidades', 'Fatura de água e luz', CURRENT_DATE - INTERVAL '1 day', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 12000, 'saida', 'Telecomunicações', 'Internet e telefone', CURRENT_DATE - INTERVAL '2 days', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 7. DADOS DE TESTE - EXPENSES (compatível com código existente)
INSERT INTO expenses (id, description, amount_kz, category, status, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Material de escritório', 25000, 'Material', 'pago', CURRENT_DATE, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Limpeza mensal', 15000, 'Serviços', 'pago', CURRENT_DATE, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Água e luz', 35000, 'Utilidades', 'pago', CURRENT_DATE - INTERVAL '1 day', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Internet', 12000, 'Telecomunicações', 'pago', CURRENT_DATE - INTERVAL '2 days', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 8. DADOS DE TESTE - EXTERNAL_HISTORY (8.700.000 Kz histórico)
INSERT INTO external_history (id, source_name, total_revenue, gross_profit, period, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Sistema Legado', 8700000, 6500000, 'CONSOLIDADO', CURRENT_DATE - INTERVAL '30 days', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 9. DADOS DE TESTE - STAFF (385.000 Kz total)
INSERT INTO staff (id, full_name, role, base_salary_kz, salario_base, status, created_at, updated_at) VALUES
    (gen_random_uuid(), 'João Silva', 'Gerente', 150000, 150000, 'active', CURRENT_DATE, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Maria Santos', 'Chefe de Cozinha', 120000, 120000, 'active', CURRENT_DATE, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Pedro Costa', 'Garçom', 115000, 115000, 'active', CURRENT_DATE, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 10. VERIFICAÇÃO - Mostrar totais inseridos
SELECT 'cash_flow' as tabela, COUNT(*) as registros, SUM(amount) as total FROM cash_flow WHERE type = 'saida'
UNION ALL
SELECT 'expenses' as tabela, COUNT(*) as registros, SUM(amount_kz) as total FROM expenses
UNION ALL  
SELECT 'external_history' as tabela, COUNT(*) as registros, SUM(total_revenue) as total FROM external_history
UNION ALL
SELECT 'staff' as tabela, COUNT(*) as registros, SUM(base_salary_kz) as total FROM staff;
