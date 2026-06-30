-- 🔑 MIGRAÇÃO CRÍTICA: data_contabil - REGRA DE NEGÓCIO
-- data_contabil pode ser mudado APENAS manualmente no Supabase Dashboard em caso de necessidade
-- O código da app NUNCA deve tentar atualizar data_contabil após a venda ser criada
-- Lógica de cálculo: 05:00 de um dia até 04:59 do dia seguinte = dia atual

-- 1. REMOVER triggers de imutabilidade (data_contabil pode ser mudado manualmente no Dashboard)
DROP TRIGGER IF EXISTS prevent_orders_data_contabil_change ON orders;
DROP TRIGGER IF EXISTS prevent_cash_flow_data_contabil_change ON cash_flow;
DROP FUNCTION IF EXISTS prevent_data_contabil_update();

-- 2. Criar índice para performance de queries por data_contabil
CREATE INDEX IF NOT EXISTS idx_orders_data_contabil ON orders(data_contabil);
CREATE INDEX IF NOT EXISTS idx_cash_flow_data_contabil ON cash_flow(data_contabil);

-- 3. Adicionar comentário documentando a regra de negócio
COMMENT ON COLUMN orders.data_contabil IS 'Dia Operacional (Business Day) - Pode ser alterado manualmente no Supabase Dashboard em caso de necessidade. Lógica de cálculo na app: 05:00 de um dia até 04:59 do dia seguinte = dia atual (timezone Africa/Luanda UTC+1).';
COMMENT ON COLUMN cash_flow.data_contabil IS 'Dia Operacional (Business Day) - Pode ser alterado manualmente no Supabase Dashboard em caso de necessidade. Lógica de cálculo na app: 05:00 de um dia até 04:59 do dia seguinte = dia atual (timezone Africa/Luanda UTC+1).';

-- 7. Verificar se há registros com data_contabil NULL e backfill
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Contar orders sem data_contabil
  SELECT COUNT(*) INTO null_count FROM orders WHERE data_contabil IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Encontradas % orders sem data_contabil. Executando backfill...', null_count;
    
    -- Backfill: usar created_at ajustado para timezone Africa/Luanda
    UPDATE orders 
    SET data_contabil = (
      CASE 
        WHEN EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')) < 5 
        THEN DATE((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda') - INTERVAL '1 day')
        ELSE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')
      END
    )
    WHERE data_contabil IS NULL;
    
    RAISE NOTICE 'Backfill concluído para orders.';
  END IF;
  
  -- Contar cash_flow sem data_contabil
  SELECT COUNT(*) INTO null_count FROM cash_flow WHERE data_contabil IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Encontrados % cash_flow sem data_contabil. Executando backfill...', null_count;
    
    UPDATE cash_flow 
    SET data_contabil = (
      CASE 
        WHEN EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')) < 5 
        THEN DATE((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda') - INTERVAL '1 day')
        ELSE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')
      END
    )
    WHERE data_contabil IS NULL;
    
    RAISE NOTICE 'Backfill concluído para cash_flow.';
  END IF;
END $$;
