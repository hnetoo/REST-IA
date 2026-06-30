const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

function execSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ sql });
    const options = {
      hostname: 'tboiuiwlqfzcvakxrsmj.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('Executando manutencao do banco de dados...\n');

  // Comandos SQL individuais (divididos para evitar problemas com EXECUTE)
  const commands = [
    {
      name: 'Funcao cleanup_old_active_orders',
      sql: `CREATE OR REPLACE FUNCTION cleanup_old_active_orders()
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
$$`
    },
    {
      name: 'Comentario cleanup_old_active_orders',
      sql: `COMMENT ON FUNCTION cleanup_old_active_orders() IS 'Limpa contas abertas antigas (mais de 24 horas e nao estao ABERTO). Executar via cron a cada hora.'`
    },
    {
      name: 'Tabela audit_logs_archive',
      sql: `CREATE TABLE IF NOT EXISTS audit_logs_archive (
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
)`
    },
    {
      name: 'Indice idx_audit_logs_archive_timestamp',
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_timestamp ON audit_logs_archive USING btree (timestamp)`
    },
    {
      name: 'Indice idx_audit_logs_archive_module',
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_module ON audit_logs_archive USING btree (module)`
    },
    {
      name: 'Comentario audit_logs_archive',
      sql: `COMMENT ON TABLE audit_logs_archive IS 'Arquivo de logs de auditoria com mais de 90 dias. Dados preservados para conformidade fiscal.'`
    },
    {
      name: 'Funcao archive_old_audit_logs',
      sql: `CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    archived_count INTEGER;
BEGIN
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
    
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    RETURN jsonb_build_object(
        'success', true,
        'archived_rows', archived_count,
        'message', format('%s logs arquivados e removidos da tabela principal', archived_count)
    );
END;
$$`
    },
    {
      name: 'Comentario archive_old_audit_logs',
      sql: `COMMENT ON FUNCTION archive_old_audit_logs() IS 'Arquiva logs de auditoria com mais de 90 dias para audit_logs_archive. Executar via cron mensal.'`
    },
    {
      name: 'Funcao get_database_size_stats',
      sql: `CREATE OR REPLACE FUNCTION get_database_size_stats()
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
$$`
    },
    {
      name: 'Comentario get_database_size_stats',
      sql: `COMMENT ON FUNCTION get_database_size_stats() IS 'Retorna estatisticas de tamanho de todas as tabelas publicas.'`
    },
    {
      name: 'Permissoes audit_logs_archive',
      sql: `GRANT ALL ON TABLE audit_logs_archive TO anon; GRANT ALL ON TABLE audit_logs_archive TO authenticated`
    }
  ];

  const results = [];
  
  for (const cmd of commands) {
    try {
      process.stdout.write(`Executando: ${cmd.name}... `);
      const result = await execSql(cmd.sql);
      console.log(`OK (HTTP ${result.status})`);
      results.push({ name: cmd.name, status: 'success', httpStatus: result.status });
    } catch (error) {
      console.log(`ERRO: ${error.message}`);
      results.push({ name: cmd.name, status: 'error', error: error.message });
    }
    // Pequena pausa entre comandos
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n========================================');
  console.log('RESUMO DA EXECUCAO');
  console.log('========================================');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`\nSucesso: ${successCount}/${commands.length}`);
  console.log(`Erros: ${errorCount}/${commands.length}\n`);
  
  if (errorCount > 0) {
    console.log('Comandos com erro:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n========================================');
  console.log('MANUTENCAO CONCLUIDA');
  console.log('========================================');
}

main().catch(console.error);
