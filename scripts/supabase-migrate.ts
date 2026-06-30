import { config } from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Client } from 'pg';

config({ override: true }); // Load .env file explicitly

type StepResult = {
  name: string;
  success: boolean;
  error?: string;
};

type SupabaseBackup = {
  categories: any[];
  dishes: any[];
  orders: any[];
  applicationState: any | null;
};

type LocalData = {
  categories: any[];
  dishes: any[];
  orders: any[];
};

const logStep = (result: StepResult) => {
  const status = result.success ? '[OK]' : '[FAIL]';
  console.log(`${status} ${result.name}`);
  if (!result.success && result.error) {
    console.error(result.error);
  }
};

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

const executeSqlFile = async (pgClient: Client, filePath: string): Promise<void> => {
  const sql = fs.readFileSync(filePath, 'utf-8');
  // Divide o script em comandos individuais, ignorando comentários e linhas vazias
  const commands = sql.split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  for (const command of commands) {
    if (command.length > 0) {
      await pgClient.query(command);
    }
  }
};

const connectSqlite = (dbPath: string) => {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database file not found at ${dbPath}`);
  }
  return new Database(dbPath, { readonly: true });
};

const safeQueryAll = (db: Database.Database, sql: string): any[] => {
  try {
    const stmt = db.prepare(sql);
    return stmt.all();
  } catch (e: any) {
    console.warn(`SQLite query failed for "${sql}":`, e.message);
    return [];
  }
};

const loadLocalData = (db: Database.Database): LocalData => {
  let categories = safeQueryAll(db, 'SELECT * FROM categories');
  let dishes = safeQueryAll(db, 'SELECT * FROM dishes');
  let orders = safeQueryAll(db, 'SELECT * FROM orders');

  if (categories.length === 0 && dishes.length === 0) {
    const stmt = db.prepare('SELECT data FROM application_state ORDER BY updated_at DESC LIMIT 1');
    const row = stmt.get();
    if (row && row.data) {
      try {
        const parsed = JSON.parse(row.data);
        categories = Array.isArray(parsed.categories) ? parsed.categories : [];
        dishes = Array.isArray(parsed.menu) ? parsed.menu : [];
        orders = Array.isArray(parsed.activeOrders) ? parsed.activeOrders : [];
        console.log('[INFO] Loaded data from application_state JSON fallback');
      } catch (e: any) {
        throw new Error(`Failed to parse application_state JSON: ${e.message}`);
      }
    }
  }

  return { categories, dishes, orders };
};

const normalizeCategory = (c: any) => ({
  id: String(c.id),
  name: String(c.name || ''),
  icon: c.icon ? String(c.icon) : null,
  visible: typeof c.isVisibleDigital === 'boolean'
    ? c.isVisibleDigital
    : (typeof c.visible === 'boolean' ? c.visible : true)
});

const normalizeDish = (d: any) => ({
  id: String(d.id),
  name: String(d.name || ''),
  price: Number(d.price || 0),
  description: d.description ? String(d.description) : null,
  image_url: d.image ? String(d.image) : (d.image_url ? String(d.image_url) : null),
  category_id: d.categoryId ? String(d.categoryId) : (d.category_id ? String(d.category_id) : null),
  is_visible_digital: typeof d.isVisibleDigital === 'boolean'
    ? d.isVisibleDigital
    : (typeof d.is_visible_digital === 'boolean' ? d.is_visible_digital : true),
  is_featured: typeof d.isFeatured === 'boolean'
    ? d.isFeatured
    : (typeof d.is_featured === 'boolean' ? d.is_featured : false)
});

const normalizeOrder = (o: any) => ({
  id: String(o.id),
  table_id: typeof o.tableId === 'number' ? o.tableId : (typeof o.table_id === 'number' ? o.table_id : null),
  status: String(o.status || 'ABERTO'),
  total: Number(o.total || 0),
  items: Array.isArray(o.items) ? o.items : [],
  created_at: o.timestamp
    ? new Date(o.timestamp).toISOString()
    : (o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString())
});

const validateAndTransform = (local: LocalData) => {
  const categoryIds = new Set<string>();
  const normalizedCategories = local.categories
    .map(normalizeCategory)
    .filter(c => {
      if (!c.id || !c.name) return false;
      if (categoryIds.has(c.id)) {
        console.warn('Duplicate category id detected, skipping:', c.id);
        return false;
      }
      categoryIds.add(c.id);
      return true;
    });

  const normalizedDishes = local.dishes
    .map(normalizeDish)
    .filter(d => {
      if (!d.id || !d.name) return false;
      if (d.category_id && !categoryIds.has(d.category_id)) {
        console.warn('Dish with invalid category_id detected, skipping:', d.id, d.category_id);
        return false;
      }
      return true;
    });

  const orderIds = new Set<string>();
  const normalizedOrders = local.orders
    .map(normalizeOrder)
    .filter(o => {
      if (!o.id) return false;
      if (orderIds.has(o.id)) {
        console.warn('Duplicate order id detected, skipping:', o.id);
        return false;
      }
      orderIds.add(o.id);
      return true;
    });

  console.log('[INFO] Normalized entities:', {
    categories: normalizedCategories.length,
    dishes: normalizedDishes.length,
    orders: normalizedOrders.length
  });

  return { categories: normalizedCategories, dishes: normalizedDishes, orders: normalizedOrders };
};

const backupSupabaseData = async (client: SupabaseClient): Promise<SupabaseBackup> => {
  const [catRes, dishRes, orderRes, stateRes] = await Promise.all([
    client.from('categories').select('*'),
    client.from('dishes').select('*'),
    client.from('orders').select('*'),
    client.from('application_state').select('*').eq('id', 'current_state').maybeSingle()
  ]);

  if (catRes.error) throw catRes.error;
  if (dishRes.error) throw dishRes.error;
  if (orderRes.error) throw orderRes.error;
  if (stateRes.error && stateRes.error.code !== 'PGRST116') throw stateRes.error;

  const backup: SupabaseBackup = {
    categories: catRes.data || [],
    dishes: dishRes.data || [],
    orders: orderRes.data || [],
    applicationState: stateRes.data || null
  };

  const backupPath = path.resolve(process.cwd(), 'supabase-backup-before-migration.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log('[INFO] Supabase backup saved to', backupPath);

  return backup;
};

const restoreSupabaseBackup = async (client: SupabaseClient, backup: SupabaseBackup) => {
  console.log('[WARN] Restoring Supabase data from backup due to migration failure...');

  await client.from('categories').delete().neq('id', '___no_such_id___');
  await client.from('dishes').delete().neq('id', '___no_such_id___');
  await client.from('orders').delete().neq('id', '___no_such_id___');

  if (backup.categories.length > 0) {
    await client.from('categories').insert(backup.categories);
  }
  if (backup.dishes.length > 0) {
    await client.from('dishes').insert(backup.dishes);
  }
  if (backup.orders.length > 0) {
    await client.from('orders').insert(backup.orders);
  }

  if (backup.applicationState) {
    await client.from('application_state').upsert(backup.applicationState);
  }

  console.log('[INFO] Supabase data restored from backup');
};

const run = async () => {
  const results: StepResult[] = [];

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    
    // Conexão direta PostgreSQL (pg) para DDL/Estrutura - OPCIONAL
    const databaseUrl = process.env['DATABASE_URL'];
    let pgClient: Client | null = null;

    if (databaseUrl) {
      pgClient = new Client({ connectionString: databaseUrl });
      try {
        await pgClient.connect();
        results.push({ name: 'Connect to PostgreSQL database', success: true });

        // Executar scripts SQL para criar a estrutura, auth e data checks
        const sqlFiles = [
          'sql/supabase_structure.sql',
          'sql/supabase_auth.sql',
          'sql/supabase_data_checks.sql',
        ];

        for (const file of sqlFiles) {
          const filePath = path.resolve(process.cwd(), file);
          if (!fs.existsSync(filePath)) {
            console.warn(`[WARN] File not found: ${file} - Skipping`);
            continue;
          }
          await executeSqlFile(pgClient, filePath);
          results.push({ name: `Execute ${file}`, success: true });
        }
      } catch (e: any) {
        console.warn(`[WARN] PostgreSQL connection/execution failed: ${e.message}`);
        console.warn('[WARN] Continuing with data migration only...');
        results.push({ name: 'PostgreSQL Direct Access', success: false, error: e.message });
      } finally {
        if (pgClient) await pgClient.end();
      }
    } else {
       console.log('[INFO] DATABASE_URL not found. Skipping SQL file execution (structure/auth).');
       results.push({ name: 'Check DATABASE_URL', success: true }); // Just to log info
    }

    results.push({ name: 'Check required environment variables', success: true });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const client = createClient(supabaseUrl, supabaseAnonKey);

    const sqlitePath = path.resolve(process.cwd(), 'tasca_vereda_v3.db');
    let sqliteDb: Database.Database | null = null;
    try {
      if (fs.existsSync(sqlitePath)) {
        sqliteDb = connectSqlite(sqlitePath);
        results.push({ name: 'Connect to local SQLite database', success: true });
      } else {
        console.warn('[WARN] SQLite database not found. Using empty data or JSON fallback if implemented.');
        // Fallback or empty logic handled in loadLocalData
      }
    } catch (e: any) {
      results.push({
        name: 'Connect to local SQLite database',
        success: false,
        error: e.message
      });
      throw e;
    }

    // Backup
    let backup: SupabaseBackup | null = null;
    try {
        backup = await backupSupabaseData(adminClient);
        results.push({ name: 'Backup current Supabase data', success: true });
    } catch (e: any) {
        console.warn('[WARN] Backup failed (maybe tables dont exist yet). Continuing...');
    }

    // Load Local Data
    let localRaw: LocalData = { categories: [], dishes: [], orders: [] };
    const jsonPath = path.resolve(process.cwd(), 'migration_data.json');

    if (sqliteDb) {
        localRaw = loadLocalData(sqliteDb);
    } else if (fs.existsSync(jsonPath)) {
        console.log(`[INFO] Loading data from JSON file: ${jsonPath}`);
        try {
          const fileContent = fs.readFileSync(jsonPath, 'utf-8');
          localRaw = JSON.parse(fileContent);
          // Ensure structure
          if (!localRaw.categories) localRaw.categories = [];
          if (!localRaw.dishes) localRaw.dishes = [];
          if (!localRaw.orders) localRaw.orders = [];
        } catch (e: any) {
          console.error(`[ERROR] Failed to parse JSON file: ${e.message}`);
          throw e;
        }
    } else {
        jsonPath = path.resolve(process.cwd(), 'migration_data.json'); // Reset to default for template
        console.warn('[WARN] No SQLite database (tasca_vereda_v3.db) or JSON file (migration_data.json) found.');
        console.warn('[WARN] Creating empty migration_data.json for manual input.');
        
        const template = {
          categories: [
            { id: "cat_001", name: "Bebidas", icon: "beer", visible: true },
            { id: "cat_002", name: "Pratos", icon: "restaurant", visible: true }
          ],
          dishes: [
             { id: "dish_001", name: "Coca Cola", price: 2.50, category_id: "cat_001", visible: true },
             { id: "dish_002", name: "Bitoque", price: 12.00, category_id: "cat_002", visible: true }
          ],
          orders: []
        };
        fs.writeFileSync(jsonPath, JSON.stringify(template, null, 2), 'utf-8');
        console.log(`[INFO] Created template at ${jsonPath}. Please populate it and run again.`);
        // Don't fail, just run with empty/template data to verify connection
        localRaw = template as any;
    }

    const local = validateAndTransform(localRaw);
    results.push({ name: 'Load and validate local data', success: true });

    // Migração de Categorias
    if (local.categories.length > 0) {
      const { error: catError } = await adminClient
        .from('categories')
        .upsert(local.categories);
        
      if (catError) {
        // Se falhar porque a tabela não existe, e não temos DATABASE_URL, é um erro fatal de setup
        results.push({ name: 'Upsert categories into Supabase', success: false, error: catError.message });
        if (backup) {
           try {
              await restoreSupabaseBackup(adminClient, backup);
           } catch(restoreErr) {
              console.warn('Backup restore failed:', restoreErr);
           }
        }
        throw catError;
      } else {
        results.push({ name: 'Upsert categories into Supabase', success: true });
      }
    } else {
      console.log('[INFO] No categories to migrate');
      results.push({ name: 'Upsert categories into Supabase', success: true });
    }

    if (local.dishes.length > 0) {
      const { error: dishError } = await adminClient
        .from('dishes')
        .upsert(local.dishes);
      if (dishError) {
        results.push({ name: 'Upsert dishes into Supabase', success: false, error: dishError.message });
        if (backup) await restoreSupabaseBackup(adminClient, backup);
        throw dishError;
      } else {
        results.push({ name: 'Upsert dishes into Supabase', success: true });
      }
    } else {
      console.log('[INFO] No dishes to migrate');
      results.push({ name: 'Upsert dishes into Supabase', success: true });
    }

    if (local.orders.length > 0) {
      const { error: orderError } = await adminClient
        .from('orders')
        .upsert(local.orders);
      if (orderError) {
        results.push({ name: 'Upsert orders into Supabase', success: false, error: orderError.message });
        if (backup) await restoreSupabaseBackup(adminClient, backup);
        throw orderError;
      } else {
        results.push({ name: 'Upsert orders into Supabase', success: true });
      }
    } else {
      console.log('[INFO] No orders to migrate');
      results.push({ name: 'Upsert orders into Supabase', success: true });
    }

    console.log('');
    console.log('Migration summary');
    results.forEach(logStep);

    const failed = results.some(r => !r.success);
    if (failed) {
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  } catch (e: any) {
    const result: StepResult = {
      name: 'Unexpected error',
      success: false,
      error: e?.message || String(e)
    };
    logStep(result);
    process.exitCode = 1;
  }
};

run();
