/**
 * Script para corrigir colunas de stock na tabela products
 * Executa migração automática via Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.9qV0p7ADmXYOYcYRLejlTwihFIlIIOS2W_tOkZwuPkw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SQL_MIGRATION = `
DO $$
BEGIN
    -- Adicionar stock_quantity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
    END IF;

    -- Adicionar unit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'un';
    END IF;

    -- Adicionar sku
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku TEXT;
    END IF;

    -- Adicionar min_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'min_stock') THEN
        ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 10;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

UPDATE products 
SET stock_quantity = COALESCE(stock_quantity, 0),
    unit = COALESCE(unit, 'un'),
    min_stock = COALESCE(min_stock, 10)
WHERE stock_quantity IS NULL 
   OR unit IS NULL 
   OR min_stock IS NULL;

-- Corrigir categorias inválidas
DO $$
BEGIN
    UPDATE products 
    SET category_id = NULL
    WHERE category_id IN (
        SELECT id FROM categories
        WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );
    
    DELETE FROM categories
    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
END $$;
`;

async function runMigration() {
  console.log('🚀 Corrigindo colunas de stock na tabela products...\n');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: SQL_MIGRATION });
    
    if (error) {
      console.error('❌ Erro na migração:', error);
      process.exit(1);
    }

    console.log('✅ Migração concluída com sucesso!');
    console.log('\nColunas adicionadas:');
    console.log('  • stock_quantity');
    console.log('  • unit');
    console.log('  • sku');
    console.log('  • min_stock');
    console.log('\nCategorias inválidas removidas');
    
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

runMigration();
