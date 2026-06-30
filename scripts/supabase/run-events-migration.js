/**
 * Script para executar migração SQL no Supabase
 * Usa a API REST do Supabase para executar SQL
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Precisa da service role key

async function runMigration() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não definida');
    console.log('Por favor, defina a variável de ambiente SUPABASE_SERVICE_ROLE_KEY');
    console.log('Ou execute via SQL Editor do Supabase Dashboard');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🚀 Iniciando migração de Eventos...');
  console.log('URL:', SUPABASE_URL);

  try {
    // 1. Criar tipos ENUM
    console.log('📦 Criando tipos ENUM...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventtype') THEN
            CREATE TYPE eventtype AS ENUM (
              'ANIVERSARIO', 'CASAMENTO', 'ALUGUER_TOTAL', 'ALUGUER_PARCIAL', 
              'SHOW_INTIMISTA', 'CORPORATIVO', 'BATIZADO', 'OUTRO'
            );
          END IF;
        END $$;
      `
    });

    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventstatus') THEN
            CREATE TYPE eventstatus AS ENUM (
              'PLANEADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'
            );
          END IF;
        END $$;
      `
    });

    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventarea') THEN
            CREATE TYPE eventarea AS ENUM (
              'SALA_PRINCIPAL', 'TERRACO', 'SALAO_PRIVADO', 'RESTAURANTE_INTEIRO'
            );
          END IF;
        END $$;
      `
    });

    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumptiontype') THEN
            CREATE TYPE consumptiontype AS ENUM (
              'ILIMITADO', 'LIMITADO', 'PACOTE_FECHADO', 'CONSUMO_POS'
            );
          END IF;
        END $$;
      `
    });

    await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventordertype') THEN
            CREATE TYPE eventordertype AS ENUM (
              'INCLUIDO', 'EXTRA'
            );
          END IF;
        END $$;
      `
    });

    console.log('✅ Tipos ENUM criados');

    // 2. Criar tabela event_packages
    console.log('📦 Criando tabela event_packages...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    console.log('✅ Tabela event_packages criada');

    // 3. Criar tabela events
    console.log('📦 Criando tabela events...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    console.log('✅ Tabela events criada');

    // 4. Criar tabela event_orders
    console.log('📦 Criando tabela event_orders...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    console.log('✅ Tabela event_orders criada');

    // 5. Atualizar tabela orders
    console.log('📝 Atualizando tabela orders...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    console.log('✅ Tabela orders atualizada');

    // 6. Atualizar tabela pos_tables
    console.log('📝 Atualizando tabela pos_tables...');
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    console.log('✅ Tabela pos_tables atualizada');

    // 7. Inserir pacotes de exemplo
    console.log('🌱 Inserindo pacotes de exemplo...');
    const { data: existingPackages } = await supabase.from('event_packages').select('id').limit(1);
    
    if (!existingPackages || existingPackages.length === 0) {
      await supabase.from('event_packages').insert([
        {
          name: 'Pacote Aniversário Básico',
          description: 'Ideal para aniversários de 10 pessoas. Inclui buffet e bebidas.',
          event_type: 'ANIVERSARIO',
          min_guests: 5,
          max_guests: 10,
          base_price: 50000,
          price_per_person: 8000,
          duration_hours: 3,
          included_items: [
            { name: 'Buffet de Salgados', quantity_per_person: 5, unlimited: false },
            { name: 'Refrigerante', quantity_per_person: 2, unlimited: true },
            { name: 'Bolo de Aniversário', quantity_per_person: 1, unlimited: false }
          ],
          allowed_areas: ['SALAO_PRIVADO', 'TERRACO']
        },
        {
          name: 'Pacote Aniversário Premium',
          description: 'Aniversário com open bar e buffet completo. Até 20 pessoas.',
          event_type: 'ANIVERSARIO',
          min_guests: 10,
          max_guests: 20,
          base_price: 100000,
          price_per_person: 12000,
          duration_hours: 5,
          included_items: [
            { name: 'Buffet Completo', quantity_per_person: 1, unlimited: true },
            { name: 'Open Bar', quantity_per_person: 1, unlimited: true },
            { name: 'Bolo Premium', quantity_per_person: 1, unlimited: false },
            { name: 'Decoração', quantity_per_person: 1, unlimited: false }
          ],
          allowed_areas: ['RESTAURANTE_INTEIRO', 'SALAO_PRIVADO']
        },
        {
          name: 'Aluguer Total - Evento Privado',
          description: 'Aluguer completo do restaurante para eventos privados.',
          event_type: 'ALUGUER_TOTAL',
          min_guests: 20,
          max_guests: 50,
          base_price: 200000,
          price_per_person: 15000,
          duration_hours: 6,
          included_items: [
            { name: 'Menu Personalizado', quantity_per_person: 1, unlimited: false },
            { name: 'Bebidas', quantity_per_person: 1, unlimited: true },
            { name: 'Som e Luz', quantity_per_person: 1, unlimited: false }
          ],
          allowed_areas: ['RESTAURANTE_INTEIRO']
        }
      ]);
      console.log('✅ Pacotes de exemplo inseridos');
    } else {
      console.log('ℹ️ Pacotes já existem, pulando...');
    }

    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('Tabelas criadas:');
    console.log('  - event_packages (Pacotes de evento)');
    console.log('  - events (Eventos)');
    console.log('  - event_orders (Pedidos vinculados a eventos)');
    console.log('\nTabelas atualizadas:');
    console.log('  - orders (adicionado event_id, is_event_order, event_order_type)');
    console.log('  - pos_tables (adicionado event_id, event_reserved)');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

// Se executado diretamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
