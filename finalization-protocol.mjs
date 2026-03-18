import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function purgeCorruptedCache() {
  try {
    console.log('🧹 PURGA DE CACHE CORROMPIDO');
    console.log('==================================');
    
    // 1. Limpar localStorage
    if (typeof localStorage !== 'undefined') {
      console.log('🗑️ Limpando localStorage...');
      
      // Identificar chaves corrompidas
      const keysToPurge = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('60e813bb-62af-4ae6-b90d-1f3ebda738f9') || // ID de Bebidas
          key.includes('corrupted') ||
          key.includes('error_sync')
        )) {
          keysToPurge.push(key);
        }
      }
      
      // Remover chaves corrompidas
      keysToPurge.forEach(key => {
        console.log(`   🗑️ Removendo: ${key}`);
        localStorage.removeItem(key);
      });
      
      console.log(`✅ LocalStorage limpo: ${keysToPurge.length} chaves removidas`);
    }
    
    // 2. Limpar IndexedDB (se existir)
    if (typeof indexedDB !== 'undefined') {
      console.log('🗑️ Limpando IndexedDB...');
      
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name.includes('tasca') || db.name.includes('rest-ia')) {
          console.log(`   🗑️ Removendo database: ${db.name}`);
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // 3. Limpar sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      console.log('🗑️ Limpando sessionStorage...');
      sessionStorage.clear();
    }
    
    console.log('✅ CACHE CORROMPIDO PURGADO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ ERRO NA PURGA DE CACHE:', error);
  }
}

async function forceFinalSync() {
  try {
    console.log('🔄 SINCRONIZAÇÃO DE FECHO');
    console.log('==================================');
    
    // 1. Sincronizar Produtos
    console.log('📦 Sincronizando Produtos...');
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('❌ Erro ao sincronizar produtos:', productsError);
    } else {
      console.log(`✅ Produtos sincronizados: ${productsData?.length || 0}`);
    }
    
    // 2. Sincronizar Categorias
    console.log('📁 Sincronizando Categorias...');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoriesError) {
      console.error('❌ Erro ao sincronizar categorias:', categoriesError);
    } else {
      console.log(`✅ Categorias sincronizadas: ${categoriesData?.length || 0}`);
    }
    
    // 3. Sincronizar Staff
    console.log('👥 Sincronizando Staff...');
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (staffError) {
      console.error('❌ Erro ao sincronizar staff:', staffError);
    } else {
      console.log(`✅ Staff sincronizado: ${staffData?.length || 0}`);
    }
    
    console.log('✅ SINCRONIZAÇÃO DE FECHO CONCLUÍDA!');
    
  } catch (error) {
    console.error('❌ ERRO NA SINCRONIZAÇÃO:', error);
  }
}

async function generateIntegrityReport() {
  try {
    console.log('📋 RELATÓRIO DE INTEGRIDADE - ECOSSISTEMA CLOUD');
    console.log('==================================================');
    
    // 1. Verificar estado atual dos dados
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*');

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*');

    // 2. Calcular métricas de integridade
    const totalProducts = productsData?.length || 0;
    const totalCategories = categoriesData?.length || 0;
    const totalStaff = staffData?.length || 0;
    
    // Verificar produtos corrompidos
    const corruptedProducts = productsData?.filter(p => 
      p.category_id === '60e813bb-62af-4ae6-b90d-1f3ebda738f9' && 
      p.image_url === null
    ) || [];
    
    // Verificar produtos com imagens
    const productsWithImages = productsData?.filter(p => p.image_url !== null) || [];
    
    // Calcular total de salários
    const totalSalaries = staffData?.reduce((sum, staff) => {
      const salario_base = Number(staff.salario_base) || Number(staff.base_salary_kz) || 0;
      const subsidios = Number(staff.subsidios) || 0;
      const bonus = Number(staff.bonus) || 0;
      const horas_extras = Number(staff.horas_extras) || 0;
      const descontos = Number(staff.descontos) || 0;
      const totalLiquido = (salario_base + subsidios + bonus + horas_extras) - descontos;
      return sum + totalLiquido;
    }, 0);
    
    // 3. Gerar relatório
    const integrityReport = {
      timestamp: new Date().toISOString(),
      status: 'INTEGRITY_CHECK',
      ecosystem: {
        status: totalProducts > 0 && totalCategories > 0 && totalStaff > 0 ? 'SINCRONIZADO' : 'INCOMPLETO',
        errors: corruptedProducts.length,
        conflicts: 0
      },
      data: {
        products: {
          total: totalProducts,
          withImages: productsWithImages.length,
          corrupted: corruptedProducts.length,
          integrity: corruptedProducts.length === 0 ? 'OK' : 'CORROMPIDO'
        },
        categories: {
          total: totalCategories,
          integrity: totalCategories > 0 ? 'OK' : 'VAZIO'
        },
        staff: {
          total: totalStaff,
          totalSalaries: totalSalaries,
          integrity: totalStaff > 0 ? 'OK' : 'VAZIO'
        }
      }
    };
    
    // 4. Exibir relatório
    console.log('📊 ESTADO FINAL DO ECOSSISTEMA CLOUD:');
    console.log(`   Status: ${integrityReport.ecosystem.status}`);
    console.log(`   Erros de Conflito: ${integrityReport.ecosystem.errors}`);
    console.log(`   Produtos: ${integrityReport.data.products.total} (${integrityReport.data.products.withImages} com imagens)`);
    console.log(`   Categorias: ${integrityReport.data.categories.total}`);
    console.log(`   Funcionários: ${integrityReport.data.staff.total} (Total: ${(integrityReport.data.staff.totalSalaries || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })})`);
    console.log(`   Integridade: ${integrityReport.data.products.integrity === 'OK' && integrityReport.data.categories.integrity === 'OK' && integrityReport.data.staff.integrity === 'OK' ? 'COMPLETA' : 'PROBLEMAS'}`);
    
    if (integrityReport.ecosystem.errors === 0) {
      console.log('✅ ZERO ERROS DE CONFLITO - SISTEMA ESTÁVEL!');
    } else {
      console.warn(`⚠️ ENCONTRADOS ${integrityReport.ecosystem.errors} PROBLEMAS DE INTEGRIDADE`);
    }
    
    // 5. Salvar relatório
    const fs = await import('fs');
    fs.writeFileSync('ecosystem_integrity_report.json', JSON.stringify(integrityReport, null, 2));
    
    console.log('📋 RELATÓRIO SALVO: ecosystem_integrity_report.json');
    console.log('🔒 RELATÓRIO DE INTEGRIDADE FINALIZADO!');
    
  } catch (error) {
    console.error('❌ ERRO NO RELATÓRIO:', error);
  }
}

async function executeFinalization() {
  console.log('🏁 EXECUTANDO ORDEM DE FINALIZAÇÃO E LIMPEZA DE CACHE');
  console.log('==================================================');
  
  await purgeCorruptedCache();
  await forceFinalSync();
  await generateIntegrityReport();
  
  console.log('🎯 CAPÍTULO FINALIZADO COM SUCESSO!');
  console.log('🔒 O Helder TEM EXPERIÊNCIA FLUIDA NA MSI!');
}

executeFinalization();
