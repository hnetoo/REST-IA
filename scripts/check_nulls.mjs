import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
});

const TABLES = [
  'products', 'categories', 'orders', 'order_items', 'staff',
  'cash_flow', 'expenses', 'suppliers', 'stock_purchases',
  'stock_purchase_items', 'stock_inventories', 'stock_inventory_items',
  'stock_movements', 'settings', 'tables', 'reservations', 'events'
];

async function checkTable(tableName) {
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: false })
    .limit(200);

  if (error) {
    return { table: tableName, error: error.message, totalRows: 0, nullStats: [] };
  }

  const totalRows = count || data.length;
  if (data.length === 0) {
    return { table: tableName, totalRows: 0, nullStats: [], note: 'Tabela vazia' };
  }

  // Get all columns from first row
  const columns = Object.keys(data[0]);
  const nullStats = [];

  for (const col of columns) {
    let nullCount = 0;
    let emptyStringCount = 0;
    let zeroCount = 0;

    for (const row of data) {
      const val = row[col];
      if (val === null || val === undefined) {
        nullCount++;
      } else if (val === '') {
        emptyStringCount++;
      } else if (val === 0) {
        zeroCount++;
      }
    }

    const nullPct = totalRows > 0 ? (nullCount / data.length) * 100 : 0;
    if (nullCount > 0 || emptyStringCount > 0) {
      nullStats.push({
        column: col,
        nullCount,
        emptyStringCount,
        nullPct: nullPct.toFixed(1),
        sample: data.find(r => r[col] !== null && r[col] !== undefined && r[col] !== '')?.[col]
      });
    }
  }

  // Sort by null count descending
  nullStats.sort((a, b) => b.nullCount - a.nullCount);

  return { table: tableName, totalRows, sampledRows: data.length, nullStats };
}

async function main() {
  console.log('='.repeat(80));
  console.log('RELATÓRIO DE VALORES NULL NO SUPABASE');
  console.log('URL:', supabaseUrl);
  console.log('Data:', new Date().toISOString());
  console.log('='.repeat(80));
  console.log();

  const results = [];

  for (const table of TABLES) {
    process.stdout.write(`A verificar ${table}...`);
    const result = await checkTable(table);
    results.push(result);
    console.log(` ${result.totalRows} linhas${result.error ? ` [ERRO: ${result.error}]` : ''}`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('RELATÓRIO DETALHADO');
  console.log('='.repeat(80));

  for (const r of results) {
    console.log();
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`TABELA: ${r.table.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    if (r.error) {
      console.log(`  ❌ ERRO: ${r.error}`);
      continue;
    }

    if (r.totalRows === 0) {
      console.log(`  ⚠️ Tabela vazia`);
      continue;
    }

    console.log(`  Total de linhas: ${r.totalRows}${r.sampledRows < r.totalRows ? ` (amostra de ${r.sampledRows})` : ''}`);
    console.log(`  Colunas com NULL ou vazio: ${r.nullStats.length}`);

    if (r.nullStats.length === 0) {
      console.log(`  ✅ Sem valores NULL detectados na amostra`);
    } else {
      console.log();
      console.log(`  ${'Coluna'.padEnd(35)} ${'NULLs'.padStart(8)} ${'Vazios'.padStart(8)} ${'% NULL'.padStart(8)}  Exemplo`);
      console.log(`  ${'─'.repeat(80)}`);
      for (const s of r.nullStats) {
        const sampleStr = s.sample !== undefined ? String(s.sample).substring(0, 25) : '—';
        console.log(`  ${s.column.padEnd(35)} ${String(s.nullCount).padStart(8)} ${String(s.emptyStringCount).padStart(8)} ${s.nullPct.padStart(7)}%  ${sampleStr}`);
      }
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(80));
  console.log('RESUMO');
  console.log('='.repeat(80));
  console.log();

  let totalTables = 0;
  let totalRows = 0;
  let totalNullColumns = 0;
  let tablesWithErrors = [];
  let emptyTables = [];
  let criticalNulls = [];

  for (const r of results) {
    if (r.error) {
      tablesWithErrors.push(r.table);
      continue;
    }
    totalTables++;
    totalRows += r.totalRows;
    if (r.totalRows === 0) {
      emptyTables.push(r.table);
    }
    for (const s of r.nullStats) {
      totalNullColumns++;
      if (parseFloat(s.nullPct) > 50) {
        criticalNulls.push({
          table: r.table,
          column: s.column,
          pct: s.nullPct,
          nulls: s.nullCount,
          total: r.totalRows
        });
      }
    }
  }

  console.log(`Tabelas verificadas: ${totalTables}`);
  console.log(`Tabelas com erro: ${tablesWithErrors.length} ${tablesWithErrors.length > 0 ? tablesWithErrors.join(', ') : ''}`);
  console.log(`Tabelas vazias: ${emptyTables.length} ${emptyTables.length > 0 ? emptyTables.join(', ') : ''}`);
  console.log(`Total de linhas: ${totalRows}`);
  console.log(`Colunas com NULL/vazio: ${totalNullColumns}`);
  console.log();

  if (criticalNulls.length > 0) {
    console.log('⚠️  COLUNAS CRÍTICAS (>50% NULL):');
    console.log();
    for (const c of criticalNulls) {
      console.log(`  ${c.table}.${c.column}: ${c.nulls}/${c.total} (${c.pct}%) NULL`);
    }
  } else {
    console.log('✅ Sem colunas críticas (>50% NULL)');
  }

  console.log();
  console.log('='.repeat(80));
  console.log('FIM DO RELATÓRIO');
  console.log('='.repeat(80));
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
