const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

function execRpc(functionName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: `/rest/v1/rpc/${functionName}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, data: json });
          } catch {
            resolve({ status: res.statusCode, data });
          }
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
  console.log('=== MANUTENCAO AUTOMATICA DO BANCO SUPABASE ===');
  console.log(`Data: ${new Date().toISOString()}\n`);

  try {
    // 1. Limpar active_orders antigos
    console.log('[1/3] Limpando active_orders > 24h...');
    const cleanup = await execRpc('cleanup_old_active_orders');
    console.log(`      Resultado: ${JSON.stringify(cleanup.data)}\n`);

    // 2. Arquivar audit_logs antigos
    console.log('[2/3] Arquivando audit_logs > 90 dias...');
    const archive = await execRpc('archive_old_audit_logs');
    console.log(`      Resultado: ${JSON.stringify(archive.data)}\n`);

    // 3. Obter estatisticas
    console.log('[3/3] Obtendo estatisticas do banco...');
    const stats = await execRpc('get_database_size_stats');
    console.log(`      Resultado: ${JSON.stringify(stats.data)}\n`);

    console.log('=== MANUTENCAO CONCLUIDA COM SUCESSO ===');
    process.exit(0);
  } catch (error) {
    console.error('=== ERRO NA MANUTENCAO ===');
    console.error(error.message);
    process.exit(1);
  }
}

main();
