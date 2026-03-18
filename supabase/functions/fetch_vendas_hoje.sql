-- Função para buscar vendas de hoje com timezone Africa/Luanda - App Principal
CREATE OR REPLACE FUNCTION fetch_vendas_hoje()
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    total_vendas NUMERIC;
BEGIN
    SELECT COALESCE(SUM(total_price), 0) INTO total_vendas
    FROM orders
    WHERE 
        status IN ('FECHADO', 'closed', 'paid')
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = (NOW() AT TIME ZONE 'Africa/Luanda')::date;
    
    RETURN total_vendas;
END;
$$;
