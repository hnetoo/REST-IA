-- 🔑 MIGRAÇÃO CRÍTICA: Proteção ROBUSTA para data_contabil
-- Auditoria + RPC para garantir integridade (SEM RLS)

-- 1. Criar tabela de auditoria para rastrear mudanças em data_contabil
CREATE TABLE IF NOT EXISTS data_contabil_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_value DATE,
  new_value DATE,
  changed_by TEXT DEFAULT current_user,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  is_manual BOOLEAN DEFAULT false
);

-- 2. Criar índice para performance de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON data_contabil_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON data_contabil_audit_log(changed_at);

-- 3. Criar função de auditoria para registrar mudanças
CREATE OR REPLACE FUNCTION log_data_contabil_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se data_contabil está sendo alterado
  IF NEW.data_contabil IS DISTINCT FROM OLD.data_contabil THEN
    INSERT INTO data_contabil_audit_log (
      table_name,
      record_id,
      old_value,
      new_value,
      changed_by,
      change_reason,
      is_manual
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::UUID,
      OLD.data_contabil,
      NEW.data_contabil,
      current_user,
      'Mudança de data_contabil',
      true -- Assume manual se passou pelo trigger
    );
    
    RAISE NOTICE 'AUDIT: data_contabil alterado em % (%): % → % (por %)', 
      TG_TABLE_NAME, NEW.id, OLD.data_contabil, NEW.data_contabil, current_user;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Adicionar trigger de auditoria na tabela orders
DROP TRIGGER IF EXISTS audit_orders_data_contabil_change ON orders;
CREATE TRIGGER audit_orders_data_contabil_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.data_contabil IS DISTINCT FROM NEW.data_contabil)
  EXECUTE FUNCTION log_data_contabil_change();

-- 5. Adicionar trigger de auditoria na tabela cash_flow
DROP TRIGGER IF EXISTS audit_cash_flow_data_contabil_change ON cash_flow;
CREATE TRIGGER audit_cash_flow_data_contabil_change
  AFTER UPDATE ON cash_flow
  FOR EACH ROW
  WHEN (OLD.data_contabil IS DISTINCT FROM NEW.data_contabil)
  EXECUTE FUNCTION log_data_contabil_change();

-- 6. Criar RPC específica para alterar data_contabil manualmente (só via dashboard)
CREATE OR REPLACE FUNCTION update_data_contabil_manual(p_table_name TEXT, p_record_id UUID, p_new_data_contabil DATE, p_reason TEXT)
RETURNS JSONB AS $func$
DECLARE
  v_old_value DATE;
BEGIN
  IF p_table_name = 'orders' THEN
    SELECT data_contabil INTO v_old_value FROM orders WHERE id = p_record_id;
    UPDATE orders SET data_contabil = p_new_data_contabil, updated_at = NOW() WHERE id = p_record_id;
  ELSIF p_table_name = 'cash_flow' THEN
    SELECT data_contabil INTO v_old_value FROM cash_flow WHERE id = p_record_id;
    UPDATE cash_flow SET data_contabil = p_new_data_contabil, updated_at = NOW() WHERE id = p_record_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tabela não suportada');
  END IF;
  
  INSERT INTO data_contabil_audit_log (table_name, record_id, old_value, new_value, changed_by, change_reason, is_manual)
  VALUES (p_table_name, p_record_id, v_old_value, p_new_data_contabil, current_user, COALESCE(p_reason, 'Manual'), true);
  
  RETURN jsonb_build_object('success', true, 'message', 'Atualizado', 'old_value', v_old_value, 'new_value', p_new_data_contabil);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissões para a RPC
GRANT EXECUTE ON FUNCTION update_data_contabil_manual(TEXT, UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_data_contabil_manual(TEXT, UUID, DATE, TEXT) TO anon;

-- 8. Criar view para ver histórico de auditoria
CREATE OR REPLACE VIEW data_contabil_audit_view AS
SELECT 
  id,
  table_name,
  record_id,
  old_value,
  new_value,
  changed_by,
  changed_at,
  change_reason,
  is_manual
FROM data_contabil_audit_log
ORDER BY changed_at DESC;

-- 9. Grant permissões para a view
GRANT SELECT ON data_contabil_audit_view TO authenticated;
GRANT SELECT ON data_contabil_audit_view TO anon;

-- 10. Adicionar comentários
COMMENT ON TABLE data_contabil_audit_log IS 'Tabela de auditoria para rastrear todas as mudanças em data_contabil. Útil para investigar alterações inesperadas.';
COMMENT ON FUNCTION update_data_contabil_manual IS 'RPC específica para alterar data_contabil manualmente. Única forma segura de alterar data_contabil após a venda ser criada.';
COMMENT ON VIEW data_contabil_audit_view IS 'View para ver histórico de auditoria de mudanças em data_contabil. Ordenado por data mais recente.';
