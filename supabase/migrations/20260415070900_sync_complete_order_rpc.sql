-- Função RPC para sincronização atômica de order e order_items
-- Garante que ou entra a ordem com todos os itens, ou não entra nada

CREATE OR REPLACE FUNCTION sync_complete_order(order_data JSONB, items_data JSONB[])
RETURNS void AS $$
BEGIN
  -- Inserir ou atualizar a order
  INSERT INTO orders SELECT * FROM jsonb_populate_record(NULL::orders, order_data)
  ON CONFLICT (id) DO UPDATE SET 
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    payment_method = EXCLUDED.payment_method,
    invoice_number = EXCLUDED.invoice_number,
    customer_id = EXCLUDED.customer_id,
    table_id = EXCLUDED.table_id,
    updated_at = now();

  -- Inserir os order_items (não atualiza se já existirem)
  INSERT INTO order_items SELECT * FROM jsonb_to_recordset(items_data) AS i(
    id UUID,
    order_id UUID,
    dish_id UUID,
    dish_name TEXT,
    quantity INTEGER,
    unit_price DECIMAL,
    total_price DECIMAL
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
