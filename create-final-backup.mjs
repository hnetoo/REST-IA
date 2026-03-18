import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalStableBackup() {
  try {
    console.log('🔒 CRIANDO BACKUP DE PAZ - FINAL STABLE');
    console.log('==================================================');
    
    // 1. Buscar produtos
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('❌ Erro ao buscar produtos:', productsError);
      return;
    }

    // 2. Buscar categorias
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoriesError) {
      console.error('❌ Erro ao buscar categorias:', categoriesError);
      return;
    }

    // 3. Buscar staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (staffError) {
      console.error('❌ Erro ao buscar staff:', staffError);
      return;
    }

    // 4. Criar backup completo
    const backupData = {
      timestamp: new Date().toISOString(),
      version: 'FINAL_STABLE_BACKUP',
      description: 'Backup de segurança quando tudo estava funcionando bem',
      stats: {
        products: productsData?.length || 0,
        categories: categoriesData?.length || 0,
        staff: staffData?.length || 0
      },
      data: {
        products: productsData || [],
        categories: categoriesData || [],
        staff: staffData || []
      }
    };

    // 5. Salvar em arquivo
    const fs = await import('fs');
    fs.writeFileSync('final_stable_backup.json', JSON.stringify(backupData, null, 2));

    console.log('✅ BACKUP DE PAZ CRIADO COM SUCESSO!');
    console.log('📊 ESTATÍSTICAS DO BACKUP:');
    console.log(`   - Produtos: ${backupData.stats.products}`);
    console.log(`   - Categorias: ${backupData.stats.categories}`);
    console.log(`   - Funcionários: ${backupData.stats.staff}`);
    console.log(`   - Arquivo: final_stable_backup.json`);
    console.log(`   - Tamanho: ${(JSON.stringify(backupData).length / 1024).toFixed(2)} KB`);

    // 6. Verificar integridade dos dados
    const corruptedProducts = productsData?.filter(p => 
      p.category_id === '60e813bb-62af-4ae6-b90d-1f3ebda738f9' && 
      p.image_url === null
    ) || [];

    if (corruptedProducts.length > 0) {
      console.warn(`⚠️ ENCONTRADOS ${corruptedProducts.length} PRODUTOS CORROMPIDOS (categoria Bebidas + imagem null)`);
    } else {
      console.log('✅ NENHUM PRODUTO CORROMPIDO ENCONTRADO');
    }

    console.log('🔒 BACKUP DE PAZ FINALIZADO - Sistema estável e seguro!');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO AO CRIAR BACKUP:', error);
  }
}

finalStableBackup();
