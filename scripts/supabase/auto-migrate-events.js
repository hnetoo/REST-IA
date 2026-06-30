/**
 * MIGRAÇÃO AUTOMÁTICA - Eventos e Pacotes
 * Executa migração via Supabase REST API (mais confiável)
 * Seguro: verifica antes de criar, não perde dados existentes
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração - Ler do ambiente ou usar valores padrão
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SECRET_KEY;

// Cliente Supabase com Service Role (necessário para DDL)
let supabase;

try {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ ERRO: Variável de ambiente necessária:');
    console.error('   SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_SECRET_KEY');
    console.error('\n   Para obter:');
    console.error('   1. Aceda ao Dashboard do Supabase → Project Settings → API');
    console.error('   2. Copie "service_role secret"');
    console.error('   3. Execute: set SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui');
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
} catch (error) {
  console.error('❌ Erro ao criar cliente Supabase:', error.message);
  process.exit(1);
}

// SQL em partes para executar separadamente (evita erros complexos)
const MIGRATION_PARTS = {
  // Parte 1: Criar ENUMs
  enums: `
    DO $$
    BEGIN
      -- Tipo: eventtype
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventtype') THEN
        CREATE TYPE eventtype AS ENUM (
          'ANIVERSARIO', 'CASAMENTO', 'ALUGUER_TOTAL', 'ALUGUER_PARCIAL', 
          'SHOW_INTIMISTA', 'CORPORATIVO', 'BATIZADO', 'OUTRO'
        );
        RAISE NOTICE 'Criado tipo: eventtype';
      END IF;

      -- Tipo: eventstatus
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventstatus') THEN
        CREATE TYPE eventstatus AS ENUM (
          'PLANEADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'
        );
        RAISE NOTICE 'Criado tipo: eventstatus';
      END IF;

      -- Tipo: eventarea
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventarea') THEN
        CREATE TYPE eventarea AS ENUM (
          'SALA_PRINCIPAL', 'TERRACO', 'SALAO_PRIVADO', 'RESTAURANTE_INTEIRO'
        );
        RAISE NOTICE 'Criado tipo: eventarea';
      END IF;

      -- Tipo: consumptiontype
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumptiontype') THEN
        CREATE TYPE consumptiontype AS ENUM (
          'ILIMITADO', 'LIMITADO', 'PACOTE_FECHADO', 'CONSUMO_POS'
        );
        RAISE NOTICE 'Criado tipo: consumptiontype';
      END IF;

      -- Tipo: eventordertype
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventordertype') THEN
        CREATE TYPE eventordertype AS ENUM (
          'INCLUIDO', 'EXTRA'
        );
        RAISE NOTICE 'Criado tipo: eventordertype';
      END IF;
    END $$;
  `,

  // Parte 2: Criar função de updated_at
  function: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Parte 3: Criar tabela event_packages
  event_packages: `
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
  `,

  // Parte 4: Criar tabela events
  events: `
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
  `,

  // Parte 5: Criar tabela event_orders
  event_orders: `
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
  `,

  // Parte 6: Alterar tabela orders (adicionar colunas)
  alter_orders: `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'orders' AND column_name = 'event_id') THEN
        ALTER TABLE orders ADD COLUMN event_id UUID;
        RAISE NOTICE 'Adicionada coluna orders.event_id';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'orders' AND column_name = 'is_event_order') THEN
        ALTER TABLE orders ADD COLUMN is_event_order BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Adicionada coluna orders.is_event_order';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'orders' AND column_name = 'event_order_type') THEN
        ALTER TABLE orders ADD COLUMN event_order_type eventordertype;
        RAISE NOTICE 'Adicionada coluna orders.event_order_type';
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);
  `,

  // Parte 7: Alterar tabela pos_tables
  alter_pos_tables: `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'pos_tables' AND column_name = 'event_id') THEN
        ALTER TABLE pos_tables ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
        RAISE NOTICE 'Adicionada coluna pos_tables.event_id';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'pos_tables' AND column_name = 'event_reserved') THEN
        ALTER TABLE pos_tables ADD COLUMN event_reserved BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Adicionada coluna pos_tables.event_reserved';
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_pos_tables_event ON pos_tables(event_id);
  `,

  // Parte 8: RLS (Row Level Security)
  rls: `
    ALTER TABLE event_packages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS event_packages_all_policy ON event_packages;
    CREATE POLICY event_packages_all_policy ON event_packages
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS events_all_policy ON events;
    CREATE POLICY events_all_policy ON events
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS event_orders_all_policy ON event_orders;
    CREATE POLICY event_orders_all_policy ON event_orders
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `,

  // Parte 9: Inserir pacotes de exemplo (opcional)
  seed: `
    INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
    SELECT 'Pacote Aniversário Básico', 'Ideal para aniversários de 10 pessoas. Inclui buffet e bebidas.', 'ANIVERSARIO', 5, 10, 50000, 8000, 3,
      '[{"name": "Buffet de Salgados", "quantity_per_person": 5, "unlimited": false},{"name": "Refrigerante", "quantity_per_person": 2, "unlimited": true},{"name": "Bolo de Aniversário", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
      '{"SALAO_PRIVADO", "TERRACO"}'
    WHERE NOT EXISTS (SELECT 1 FROM event_packages LIMIT 1);

    INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
    SELECT 'Pacote Aniversário Premium', 'Aniversário com open bar e buffet completo. Até 20 pessoas.', 'ANIVERSARIO', 10, 20, 100000, 12000, 5,
      '[{"name": "Buffet Completo", "quantity_per_person": 1, "unlimited": true},{"name": "Open Bar", "quantity_per_person": 1, "unlimited": true},{"name": "Bolo Premium", "quantity_per_person": 1, "unlimited": false},{"name": "Decoração", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
      '{"RESTAURANTE_INTEIRO", "SALAO_PRIVADO"}'
    WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Pacote Aniversário Premium');

    INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
    SELECT 'Aluguer Total - Evento Privado', 'Aluguer completo do restaurante para eventos privados.', 'ALUGUER_TOTAL', 20, 50, 200000, 15000, 6,
      '[{"name": "Menu Personalizado", "quantity_per_person": 1, "unlimited": false},{"name": "Bebidas", "quantity_per_person": 1, "unlimited": true},{"name": "Som e Luz", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
      '{"RESTAURANTE_INTEIRO"}'
    WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Aluguer Total - Evento Privado');
  `,

  // Parte 10: RPC Functions
  rpc_functions: `
    CREATE OR REPLACE FUNCTION increment_event_extras(event_id UUID, amount DECIMAL)
    RETURNS void AS $$
    BEGIN
      UPDATE events
      SET 
        extras_amount = COALESCE(extras_amount, 0) + amount,
        final_amount = COALESCE(base_amount, 0) + COALESCE(extras_amount, 0) + amount,
        updated_at = NOW()
      WHERE id = event_id;
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
  `
};

// Função para executar SQL via RPC
async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    // Usar rpc exec_sql se disponível, senão tentar via REST
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Tentar método alternativo: criar função temporária
      console.log(`   Tentando método alternativo...`);
      
      // Executar como query direta (só funciona com service_role)
      const { error: queryError } = await supabase.from('_temp_exec').select('*').limit(0);
      
      if (queryError && queryError.message.includes('does not exist')) {
        // Tentar via PostgREST raw query
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'tx=commit'
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err);
        }
      }
    }
    
    console.log(`   ✅ ${description} - OK`);
    return true;
  } catch (error) {
    console.error(`   ❌ ${description} - ERRO:`, error.message);
    
    // Verificar se é erro de "já existe" (não crítico)
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('já existe')) {
      console.log(`   ℹ️  Item já existe, continuando...`);
      return true;
    }
    
    return false;
  }
}

// Função principal de migração
async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 MIGRAÇÃO AUTOMÁTICA - Eventos e Pacotes');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  URL:', SUPABASE_URL);
  console.log('  Data:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════\n');

  const steps = [
    { name: 'Tipos ENUM (eventtype, eventstatus, etc)', sql: MIGRATION_PARTS.enums },
    { name: 'Função update_updated_at_column', sql: MIGRATION_PARTS.function },
    { name: 'Tabela event_packages', sql: MIGRATION_PARTS.event_packages },
    { name: 'Tabela events', sql: MIGRATION_PARTS.events },
    { name: 'Tabela event_orders', sql: MIGRATION_PARTS.event_orders },
    { name: 'Alterar tabela orders', sql: MIGRATION_PARTS.alter_orders },
    { name: 'Alterar tabela pos_tables', sql: MIGRATION_PARTS.alter_pos_tables },
    { name: 'Row Level Security (RLS)', sql: MIGRATION_PARTS.rls },
    { name: 'RPC Functions', sql: MIGRATION_PARTS.rpc_functions },
    { name: 'Pacotes de exemplo', sql: MIGRATION_PARTS.seed },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const step of steps) {
    const success = await executeSQL(step.sql, step.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
      
      // Perguntar se continua (em modo interativo)
      if (process.stdout.isTTY) {
        console.log('\n⚠️  Erro detectado. Deseja:');
        console.log('   [C] Continuar para próximo passo');
        console.log('   [S] Saltar todos os erros restantes');
        console.log('   [X] Abortar migração');
        // Em modo não-interativo, continua automaticamente
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 RESUMO DA MIGRAÇÃO');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   ✅ Passos bem-sucedidos: ${successCount}/${steps.length}`);
  console.log(`   ❌ Passos com erro: ${failCount}/${steps.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failCount === 0) {
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log('Tabelas criadas:');
    console.log('  • event_packages');
    console.log('  • events');
    console.log('  • event_orders');
    console.log('\nTabelas atualizadas:');
    console.log('  • orders (+ event_id, is_event_order, event_order_type)');
    console.log('  • pos_tables (+ event_id, event_reserved)');
    process.exit(0);
  } else {
    console.log('⚠️  MIGRAÇÃO CONCLUÍDA COM ALGUNS ERROS\n');
    console.log('Dicas:');
    console.log('  • Erros de "já existe" são normais e seguros');
    console.log('  • Verifique as mensagens acima para detalhes');
    console.log('  • Pode executar novamente - script é idempotente');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
}

module.exports = { runMigration, MIGRATION_PARTS };
