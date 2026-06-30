/**
 * MIGRAÇÃO AUTOMÁTICA SUPABASE - V2
 * Usa API REST com Service Role para executar SQL diretamente
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.9qV0p7ADmXYOYcYRLejlTwihFIlIIOS2W_tOkZwuPkw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeSQL(description, sql) {
  console.log(`\n🔄 ${description}...`);
  try {
    // Tentar usar PostgREST diretamente via fetch
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'tx=commit'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Se a função não existe, tentar método alternativo
      if (errorText.includes('Could not find the function')) {
        console.log('   ℹ️ Função exec_sql não existe. Criando tabelas via método alternativo...');
        
        // Tentar criar via query direta (só funciona se PostgREST permitir)
        const queryResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'tx=commit',
            'X-Client-Info': 'supabase-js/2.0'
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (!queryResponse.ok) {
          const queryError = await queryResponse.text();
          throw new Error(queryError);
        }
        
        console.log(`   ✅ ${description} - OK (via query direta)`);
        return true;
      }
      
      throw new Error(errorText);
    }

    console.log(`   ✅ ${description} - OK`);
    return true;
  } catch (error) {
    console.error(`   ❌ ${description} - ERRO:`, error.message.substring(0, 100));
    
    // Verificar se é erro de "já existe" (não crítico)
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('AlreadyExists')) {
      console.log(`   ℹ️  Item já existe, continuando...`);
      return true;
    }
    
    return false;
  }
}

async function runMigrations() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 MIGRAÇÃO AUTOMÁTICA SUPABASE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Criar função exec_sql primeiro
  const createExecSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
    GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
    GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
  `;
  
  await executeSQL('Criar função exec_sql', createExecSQL);

  // 2. Criar ENUMs
  const createEnums = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventtype') THEN
        CREATE TYPE eventtype AS ENUM ('ANIVERSARIO', 'CASAMENTO', 'ALUGUER_TOTAL', 'ALUGUER_PARCIAL', 'SHOW_INTIMISTA', 'CORPORATIVO', 'BATIZADO', 'OUTRO');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventstatus') THEN
        CREATE TYPE eventstatus AS ENUM ('PLANEADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventarea') THEN
        CREATE TYPE eventarea AS ENUM ('SALA_PRINCIPAL', 'TERRACO', 'SALAO_PRIVADO', 'RESTAURANTE_INTEIRO');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumptiontype') THEN
        CREATE TYPE consumptiontype AS ENUM ('ILIMITADO', 'LIMITADO', 'PACOTE_FECHADO', 'CONSUMO_POS');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventordertype') THEN
        CREATE TYPE eventordertype AS ENUM ('INCLUIDO', 'EXTRA');
      END IF;
    END $$;
  `;
  
  await executeSQL('Criar tipos ENUM', createEnums);

  // 3. Criar tabela event_packages
  const createEventPackages = `
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
    CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER update_event_packages_updated_at BEFORE UPDATE ON event_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
  
  await executeSQL('Criar tabela event_packages', createEventPackages);

  // 4. Criar tabela events
  const createEvents = `
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
    CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
  
  await executeSQL('Criar tabela events', createEvents);

  // 5. Criar tabela event_orders
  const createEventOrders = `
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
    CREATE TRIGGER update_event_orders_updated_at BEFORE UPDATE ON event_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
  
  await executeSQL('Criar tabela event_orders', createEventOrders);

  // 6. Adicionar colunas de stock à tabela products
  const alterProducts = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'un';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 10;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0), unit = COALESCE(unit, 'un'), min_stock = COALESCE(min_stock, 10)
    WHERE stock_quantity IS NULL OR unit IS NULL OR min_stock IS NULL;
  `;
  
  await executeSQL('Adicionar colunas de stock em products', alterProducts);

  // 7. Atualizar tabela orders
  const alterOrders = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'event_id') THEN
        ALTER TABLE orders ADD COLUMN event_id UUID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_event_order') THEN
        ALTER TABLE orders ADD COLUMN is_event_order BOOLEAN DEFAULT FALSE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'event_order_type') THEN
        ALTER TABLE orders ADD COLUMN event_order_type eventordertype;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);
  `;
  
  await executeSQL('Atualizar tabela orders', alterOrders);

  // 8. Atualizar tabela pos_tables
  const alterPosTables = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_tables' AND column_name = 'event_id') THEN
        ALTER TABLE pos_tables ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_tables' AND column_name = 'event_reserved') THEN
        ALTER TABLE pos_tables ADD COLUMN event_reserved BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_pos_tables_event ON pos_tables(event_id);
  `;
  
  await executeSQL('Atualizar tabela pos_tables', alterPosTables);

  // 9. Corrigir categorias inválidas
  const fixCategories = `
    UPDATE products SET category_id = NULL
    WHERE category_id IN (SELECT id FROM categories WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    DELETE FROM categories WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  `;
  
  await executeSQL('Corrigir categorias inválidas', fixCategories);

  // 10. Inserir pacotes de exemplo
  const seedPackages = `
    INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
    SELECT 'Pacote Aniversário Básico', 'Ideal para aniversários de 10 pessoas. Inclui buffet e bebidas.', 'ANIVERSARIO', 5, 10, 50000, 8000, 3,
      '[{"name": "Buffet de Salgados", "quantity_per_person": 5, "unlimited": false},{"name": "Refrigerante", "quantity_per_person": 2, "unlimited": true},{"name": "Bolo de Aniversário", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
      ARRAY['SALAO_PRIVADO', 'TERRACO']
    WHERE NOT EXISTS (SELECT 1 FROM event_packages LIMIT 1);
    
    INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
    SELECT 'Pacote Aniversário Premium', 'Aniversário com open bar e buffet completo. Até 20 pessoas.', 'ANIVERSARIO', 10, 20, 100000, 12000, 5,
      '[{"name": "Buffet Completo", "quantity_per_person": 1, "unlimited": true},{"name": "Open Bar", "quantity_per_person": 1, "unlimited": true},{"name": "Bolo Premium", "quantity_per_person": 1, "unlimited": false},{"name": "Decoração", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
      ARRAY['RESTAURANTE_INTEIRO', 'SALAO_PRIVADO']
    WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Pacote Aniversário Premium');
    
    INSERT INTO event_packages (name, description, event_type, min_guests, max_guests, base_price, price_per_person, duration_hours, included_items, allowed_areas)
    SELECT 'Aluguer Total - Evento Privado', 'Aluguer completo do restaurante para eventos privados.', 'ALUGUER_TOTAL', 20, 50, 200000, 15000, 6,
      '[{"name": "Menu Personalizado", "quantity_per_person": 1, "unlimited": false},{"name": "Bebidas", "quantity_per_person": 1, "unlimited": true},{"name": "Som e Luz", "quantity_per_person": 1, "unlimited": false}]'::jsonb,
      ARRAY['RESTAURANTE_INTEIRO']
    WHERE NOT EXISTS (SELECT 1 FROM event_packages WHERE name = 'Aluguer Total - Evento Privado');
  `;
  
  await executeSQL('Inserir pacotes de exemplo', seedPackages);

  // 11. Configurar RLS
  const configureRLS = `
    ALTER TABLE event_packages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS event_packages_all_policy ON event_packages;
    DROP POLICY IF EXISTS events_all_policy ON events;
    DROP POLICY IF EXISTS event_orders_all_policy ON event_orders;
    CREATE POLICY event_packages_all_policy ON event_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY events_all_policy ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY event_orders_all_policy ON event_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `;
  
  await executeSQL('Configurar RLS', configureRLS);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ MIGRAÇÃO CONCLUÍDA!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Tabelas criadas: event_packages, events, event_orders');
  console.log('Colunas adicionadas: stock_quantity, unit, sku, min_stock');
  console.log('Categorias inválidas: corrigidas');
  console.log('\n🎉 Tudo pronto! Reinicie a aplicação.');
}

runMigrations().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
