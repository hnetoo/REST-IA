-- ============================================
-- MANUTENCAO AUTOMATICA DO BANCO DE DADOS
-- Fase 1: Limpeza de active_orders > 24h
-- Fase 2: Arquivamento de audit_logs > 90 dias
-- ============================================

-- ============================================
-- FASE 1: LIMPEZA DE ACTIVE_ORDERS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_active_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_orders
    WHERE updated_at < NOW() - INTERVAL '24 hours'
      AND status != 'ABERTO';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_rows', deleted_count,
        'message', format('%s contas antigas limpas', deleted_count)
    );
END;
$$;

COMMENT ON FUNCTION cleanup_old_active_orders() IS 
'Limpa contas abertas antigas (mais de 24 horas e nao estao ABERTO). Executar via cron a cada hora.';

-- ============================================
-- FASE 2: ARQUIVAMENTO DE AUDIT_LOGS
-- ============================================

-- 1. Criar tabela de arquivamento
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    id integer NOT NULL,
    user_id character varying(255),
    user_name character varying(255),
    action character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    entity_type character varying(50),
    entity_id character varying(255),
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(50),
    user_agent text,
    timestamp timestamp without time zone DEFAULT now(),
    archived_at timestamp without time zone DEFAULT now()
);

-- Indice para buscas eficientes no arquivo
CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_timestamp 
    ON audit_logs_archive USING btree (timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_module 
    ON audit_logs_archive USING btree (module);

-- Comentario
COMMENT ON TABLE audit_logs_archive IS 
'Arquivo de logs de auditoria com mais de 90 dias. Dados preservados para conformidade fiscal.';

-- 2. Criar funcao de arquivamento
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Inserir logs antigos no arquivo
    INSERT INTO audit_logs_archive (
        id, user_id, user_name, action, module, 
        entity_type, entity_id, old_values, new_values,
        ip_address, user_agent, timestamp
    )
    SELECT 
        id, user_id, user_name, action, module,
        entity_type, entity_id, old_values, new_values,
        ip_address, user_agent, timestamp
    FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Remover logs arquivados da tabela principal
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    RETURN jsonb_build_object(
        'success', true,
        'archived_rows', archived_count,
        'message', format('%s logs arquivados e removidos da tabela principal', archived_count)
    );
END;
$$;

COMMENT ON FUNCTION archive_old_audit_logs() IS 
'Arquiva logs de auditoria com mais de 90 dias para audit_logs_archive. Executar via cron mensal.';

-- 3. Funcao para obter estatisticas de tamanho
CREATE OR REPLACE FUNCTION get_database_size_stats()
RETURNS TABLE (
    table_name text,
    row_count bigint,
    size_pretty text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        (SELECT COUNT(*) FROM pg_class c 
         JOIN pg_namespace n ON n.oid = c.relnamespace 
         WHERE n.nspname = 'public' AND c.relname = t.tablename)::bigint,
        pg_size_pretty(pg_total_relation_size('public.' || t.tablename))::text
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size('public.' || t.tablename) DESC;
END;
$$;

COMMENT ON FUNCTION get_database_size_stats() IS 
'Retorna estatisticas de tamanho de todas as tabelas publicas.';

-- ============================================
-- PERMISSOES
-- ============================================
GRANT ALL ON TABLE audit_logs_archive TO anon;
GRANT ALL ON TABLE audit_logs_archive TO authenticated;
