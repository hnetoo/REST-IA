-- Função para buscar vendas de hoje com timezone Africa/Luanda processado no servidor
CREATE OR REPLACE FUNCTION fetch_vendas_hoje_africa_luanda()
RETURNS TABLE(total NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(o.total_amount), 0) as total
    FROM orders o
    WHERE 
        o.status IN ('closed', 'paid')
        AND o.created_at >= CURRENT_DATE AT TIME ZONE 'Africa/Luanda'
        AND o.created_at < (CURRENT_DATE AT TIME ZONE 'Africa/Luanda' + INTERVAL '1 day');
END;
$$;
