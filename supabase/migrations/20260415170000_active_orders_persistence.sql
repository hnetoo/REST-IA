-- 🔑 MIGRAÇÃO CRÍTICA: Persistência de Contas Abertas (ABERTO)
-- Problema: Contas abertas são perdidas após falha de energia
-- Solução: Criar tabela active_orders para persistir contas abertas no Supabase

-- 1. Criar tabela active_orders
CREATE TABLE IF NOT EXISTS active_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT NOT NULL UNIQUE, -- ID local da order (ord-XXXXX)
  table_id INTEGER,
  type TEXT DEFAULT 'LOCAL',
  status TEXT NOT NULL DEFAULT 'ABERTO',
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(10,2) DEFAULT 0,
  tax_total NUMERIC(10,2) DEFAULT 0,
  profit NUMERIC(10,2) DEFAULT 0,
  sub_account_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_id TEXT, -- Identificador do dispositivo
  session_id TEXT -- Identificador da sessão
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_active_orders_local_id ON active_orders(local_id);
CREATE INDEX IF NOT EXISTS idx_active_orders_table_id ON active_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_active_orders_status ON active_orders(status);
CREATE INDEX IF NOT EXISTS idx_active_orders_device ON active_orders(device_id);
CREATE INDEX IF NOT EXISTS idx_active_orders_timestamp ON active_orders(timestamp DESC);

-- 3. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_active_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_active_orders_updated_at_trigger ON active_orders;
CREATE TRIGGER update_active_orders_updated_at_trigger
  BEFORE UPDATE ON active_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_active_orders_updated_at();

-- 4. Criar RPC para salvar/atualizar conta aberta
CREATE OR REPLACE FUNCTION save_active_order(
  p_local_id TEXT,
  p_table_id INTEGER,
  p_type TEXT,
  p_status TEXT,
  p_items JSONB,
  p_total NUMERIC,
  p_tax_total NUMERIC,
  p_profit NUMERIC,
  p_sub_account_name TEXT,
  p_device_id TEXT,
  p_session_id TEXT
)
RETURNS JSONB AS $func$
BEGIN
  INSERT INTO active_orders (
    local_id, table_id, type, status, items, total, tax_total, profit,
    sub_account_name, device_id, session_id
  ) VALUES (
    p_local_id, p_table_id, p_type, p_status, p_items, p_total, p_tax_total, p_profit,
    p_sub_account_name, p_device_id, p_session_id
  )
  ON CONFLICT (local_id)
  DO UPDATE SET
    table_id = EXCLUDED.table_id,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    items = EXCLUDED.items,
    total = EXCLUDED.total,
    tax_total = EXCLUDED.tax_total,
    profit = EXCLUDED.profit,
    sub_account_name = EXCLUDED.sub_account_name,
    updated_at = NOW()
  WHERE active_orders.local_id = save_active_order.p_local_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Conta aberta salva');
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar RPC para recuperar contas abertas
CREATE OR REPLACE FUNCTION get_active_orders(p_device_id TEXT DEFAULT NULL)
RETURNS JSONB AS $func$
DECLARE
  v_orders JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'local_id', local_id,
      'table_id', table_id,
      'type', type,
      'status', status,
      'items', items,
      'total', total,
      'tax_total', tax_total,
      'profit', profit,
      'sub_account_name', sub_account_name,
      'timestamp', timestamp
    )
  ) INTO v_orders
  FROM active_orders
  WHERE (p_device_id IS NULL OR device_id = p_device_id)
    AND status = 'ABERTO'
    AND updated_at > NOW() - INTERVAL '24 hours'; -- Apenas últimas 24 horas
  
  RETURN jsonb_build_object('success', true, 'orders', COALESCE(v_orders, '[]'::jsonb));
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar RPC para deletar conta aberta (quando fechada)
CREATE OR REPLACE FUNCTION delete_active_order(p_local_id TEXT)
RETURNS JSONB AS $func$
BEGIN
  DELETE FROM active_orders WHERE local_id = p_local_id;
  RETURN jsonb_build_object('success', true, 'message', 'Conta aberta removida');
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar RPC para limpar contas abertas antigas (mais de 24 horas)
CREATE OR REPLACE FUNCTION cleanup_old_active_orders()
RETURNS JSONB AS $func$
BEGIN
  DELETE FROM active_orders
  WHERE updated_at < NOW() - INTERVAL '24 hours';
  
  RETURN jsonb_build_object('success', true, 'message', 'Contas antigas limpas');
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissões
GRANT ALL ON active_orders TO authenticated;
GRANT ALL ON active_orders TO anon;
GRANT EXECUTE ON FUNCTION save_active_order TO authenticated;
GRANT EXECUTE ON FUNCTION save_active_order TO anon;
GRANT EXECUTE ON FUNCTION get_active_orders TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_orders TO anon;
GRANT EXECUTE ON FUNCTION delete_active_order TO authenticated;
GRANT EXECUTE ON FUNCTION delete_active_order TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_active_orders TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_active_orders TO anon;

-- 9. Adicionar comentários
COMMENT ON TABLE active_orders IS 'Tabela para persistir contas abertas no Supabase. Resolve problema de perda de dados após falha de energia.';
COMMENT ON FUNCTION save_active_order IS 'RPC para salvar/atualizar conta aberta no Supabase.';
COMMENT ON FUNCTION get_active_orders IS 'RPC para recuperar contas abertas do Supabase.';
COMMENT ON FUNCTION delete_active_order IS 'RPC para deletar conta aberta quando fechada.';
COMMENT ON FUNCTION cleanup_old_active_orders IS 'RPC para limpar contas abertas antigas (mais de 24 horas).';
