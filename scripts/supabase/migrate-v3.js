/**
 * MIGRAÇÃO AUTOMÁTICA SUPABASE - V3
 * Usa API REST com headers corretos
 */

const https = require('https');

const SUPABASE_URL = 'tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.9qV0p7ADmXYOYcYRLejlTwihFIlIIOS2W_tOkZwuPkw';

function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let response = '';
      res.on('data', (chunk) => response += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(response);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${response}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Iniciando migração...\n');

  const queries = [
    // 1. Colunas de stock em products
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un', ADD COLUMN IF NOT EXISTS sku TEXT, ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 10`,
    
    // 2. Atualizar produtos
    `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0), unit = COALESCE(unit, 'un'), min_stock = COALESCE(min_stock, 10) WHERE stock_quantity IS NULL OR unit IS NULL OR min_stock IS NULL`,
    
    // 3. Criar ENUMs
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventtype') THEN CREATE TYPE eventtype AS ENUM ('ANIVERSARIO', 'CASAMENTO', 'ALUGUER_TOTAL', 'ALUGUER_PARCIAL', 'SHOW_INTIMISTA', 'CORPORATIVO', 'BATIZADO', 'OUTRO'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventstatus') THEN CREATE TYPE eventstatus AS ENUM ('PLANEADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventarea') THEN CREATE TYPE eventarea AS ENUM ('SALA_PRINCIPAL', 'TERRACO', 'SALAO_PRIVADO', 'RESTAURANTE_INTEIRO'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consumptiontype') THEN CREATE TYPE consumptiontype AS ENUM ('ILIMITADO', 'LIMITADO', 'PACOTE_FECHADO', 'CONSUMO_POS'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eventordertype') THEN CREATE TYPE eventordertype AS ENUM ('INCLUIDO', 'EXTRA'); END IF; END $$`,
    
    // 4. Criar tabela event_packages
    `CREATE TABLE IF NOT EXISTS event_packages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, event_type eventtype, min_guests INTEGER DEFAULT 1, max_guests INTEGER DEFAULT 10, included_items JSONB DEFAULT '[]'::jsonb, base_price DECIMAL(12, 2) DEFAULT 0, price_per_person DECIMAL(12, 2) DEFAULT 0, allowed_areas TEXT[] DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE, duration_hours INTEGER DEFAULT 4, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    
    // 5. Criar tabela events
    `CREATE TABLE IF NOT EXISTS events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, type eventtype NOT NULL, status eventstatus DEFAULT 'PLANEADO', customer_name TEXT NOT NULL, customer_phone TEXT, customer_email TEXT, start_date DATE NOT NULL, end_date DATE, start_time TEXT, end_time TEXT, area eventarea, tables_reserved INTEGER[] DEFAULT '{}', guests_count INTEGER DEFAULT 0, guests_confirmed INTEGER DEFAULT 0, package_id UUID REFERENCES event_packages(id) ON DELETE SET NULL, included_items JSONB DEFAULT '[]'::jsonb, consumption_mode consumptiontype DEFAULT 'PACOTE_FECHADO', base_amount DECIMAL(12, 2) DEFAULT 0, extras_amount DECIMAL(12, 2) DEFAULT 0, deposit_amount DECIMAL(12, 2) DEFAULT 0, final_amount DECIMAL(12, 2) DEFAULT 0, notes TEXT, special_requests TEXT, assigned_staff UUID[] DEFAULT '{}', external_suppliers JSONB DEFAULT '[]'::jsonb, schedule JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), created_by UUID)`,
    
    // 6. Criar tabela event_orders
    `CREATE TABLE IF NOT EXISTS event_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE, order_id UUID UNIQUE NOT NULL, order_type eventordertype DEFAULT 'INCLUIDO', table_number INTEGER, is_unlimited BOOLEAN DEFAULT FALSE, unlimited_type TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
    
    // 7. Corrigir categorias
    `UPDATE products SET category_id = NULL WHERE category_id IN (SELECT id FROM categories WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')`,
    `DELETE FROM categories WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`,
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      console.log(`🔄 Executando query ${i + 1}/${queries.length}...`);
      await execSQL(queries[i]);
      console.log(`   ✅ OK`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('AlreadyExists') || err.message.includes('duplicate')) {
        console.log(`   ℹ️ Já existe, continuando...`);
      } else {
        console.log(`   ❌ Erro: ${err.message.substring(0, 100)}`);
      }
    }
  }

  console.log('\n✅ Migração concluída! Reinicie a aplicação.');
}

runMigration();
