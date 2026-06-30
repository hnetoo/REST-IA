-- ============================================
-- RPC FUNCTIONS para Eventos
-- ============================================

-- Função para incrementar/decrementar extras_amount de um evento
-- Usada quando pedidos são adicionados/removidos do evento
CREATE OR REPLACE FUNCTION increment_event_extras(
  event_id UUID,
  amount DECIMAL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE events
  SET 
    extras_amount = COALESCE(extras_amount, 0) + amount,
    final_amount = COALESCE(base_amount, 0) + COALESCE(extras_amount, 0) + amount,
    updated_at = NOW()
  WHERE id = event_id;
END;
$$;

-- Função para calcular disponibilidade de mesas para uma data
CREATE OR REPLACE FUNCTION get_available_tables_for_date(
  p_date DATE,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (table_id INT)
LANGUAGE plpgsql
AS $$
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
$$;

-- Função para verificar conflitos de horário
CREATE OR REPLACE FUNCTION check_event_time_conflict(
  p_date DATE,
  p_start_time TIME,
  p_duration_hours INT,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  conflict_start TIME,
  conflict_end TIME
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_minutes INT;
  v_end_minutes INT;
BEGIN
  v_start_minutes := EXTRACT(HOUR FROM p_start_time) * 60 + EXTRACT(MINUTE FROM p_start_time);
  v_end_minutes := v_start_minutes + (p_duration_hours * 60);

  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.start_time::TIME,
    e.end_time::TIME
  FROM events e
  WHERE e.start_date = p_date
    AND e.status NOT IN ('CANCELADO', 'CONCLUIDO')
    AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
    AND (
      -- Verificar sobreposição
      (e.start_time::TIME, e.end_time::TIME) OVERLAPS 
      (p_start_time, p_start_time + (p_duration_hours || ' hours')::INTERVAL)
    );
END;
$$;

-- Função para obter resumo financeiro do evento
CREATE OR REPLACE FUNCTION get_event_financial_summary(
  p_event_id UUID
)
RETURNS TABLE (
  base_amount DECIMAL,
  extras_amount DECIMAL,
  deposit_amount DECIMAL,
  final_amount DECIMAL,
  remaining_amount DECIMAL,
  total_orders INT,
  included_orders INT,
  extra_orders INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.base_amount,
    e.extras_amount,
    e.deposit_amount,
    e.final_amount,
    (e.final_amount - e.deposit_amount) as remaining_amount,
    COUNT(eo.id)::INT as total_orders,
    COUNT(eo.id) FILTER (WHERE eo.order_type = 'INCLUIDO')::INT as included_orders,
    COUNT(eo.id) FILTER (WHERE eo.order_type = 'EXTRA')::INT as extra_orders
  FROM events e
  LEFT JOIN event_orders eo ON eo.event_id = e.id
  WHERE e.id = p_event_id
  GROUP BY e.id, e.base_amount, e.extras_amount, e.deposit_amount, e.final_amount;
END;
$$;

-- Função para clonar um pacote (criar cópia)
CREATE OR REPLACE FUNCTION clone_event_package(
  p_package_id UUID,
  p_new_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO event_packages (
    name,
    description,
    event_type,
    min_guests,
    max_guests,
    included_items,
    base_price,
    price_per_person,
    allowed_areas,
    is_active,
    duration_hours
  )
  SELECT 
    COALESCE(p_new_name, name || ' (Cópia)'),
    description,
    event_type,
    min_guests,
    max_guests,
    included_items,
    base_price,
    price_per_person,
    allowed_areas,
    is_active,
    duration_hours
  FROM event_packages
  WHERE id = p_package_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Trigger function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar triggers às tabelas
DROP TRIGGER IF EXISTS update_event_packages_updated_at ON event_packages;
CREATE TRIGGER update_event_packages_updated_at
  BEFORE UPDATE ON event_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_orders_updated_at ON event_orders;
CREATE TRIGGER update_event_orders_updated_at
  BEFORE UPDATE ON event_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PERMISSÕES (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE event_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS event_packages_all_policy ON event_packages;
DROP POLICY IF EXISTS events_all_policy ON events;
DROP POLICY IF EXISTS event_orders_all_policy ON event_orders;
DROP POLICY IF EXISTS event_packages_anon_policy ON event_packages;
DROP POLICY IF EXISTS events_anon_policy ON events;
DROP POLICY IF EXISTS event_orders_anon_policy ON event_orders;

-- Políticas para usuários autenticados (permissão total)
CREATE POLICY event_packages_all_policy ON event_packages
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY events_all_policy ON events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY event_orders_all_policy ON event_orders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para anônimos (apenas leitura de pacotes ativos)
CREATE POLICY event_packages_anon_policy ON event_packages
  FOR SELECT TO anon
  USING (is_active = true);

-- Comentários para documentação
COMMENT ON TABLE event_packages IS 'Pacotes de evento editáveis do restaurante';
COMMENT ON TABLE events IS 'Eventos agendados no restaurante';
COMMENT ON TABLE event_orders IS 'Vínculo entre pedidos do POS e eventos';

COMMENT ON FUNCTION increment_event_extras IS 'Incrementa/decrementa o valor de extras de um evento';
COMMENT ON FUNCTION get_available_tables_for_date IS 'Retorna mesas disponíveis para uma data específica';
COMMENT ON FUNCTION check_event_time_conflict IS 'Verifica conflitos de horário para novos eventos';
COMMENT ON FUNCTION get_event_financial_summary IS 'Retorna resumo financeiro completo do evento';
COMMENT ON FUNCTION clone_event_package IS 'Cria uma cópia de um pacote existente';
