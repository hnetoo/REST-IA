// Script de limpeza forçada - executar no console do navegador
console.log('🧹 [FORCE CLEAN] Iniciando limpeza forçada completa...');

async function forceCleanEverything() {
  try {
    // 1. Limpar localStorage completamente
    console.log('🧹 Limpando localStorage...');
    localStorage.clear();
    
    // 2. Limpar sessionStorage
    console.log('🧹 Limpando sessionStorage...');
    sessionStorage.clear();
    
    // 3. Limpar cookies
    console.log('🧹 Limpando cookies...');
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +| +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // 4. Limpar IndexedDB (se existir)
    if (window.indexedDB) {
      console.log('🧹 Limpando IndexedDB...');
      const databases = await indexedDB.databases();
      databases.forEach(db => {
        indexedDB.deleteDatabase(db.name);
      });
    }
    
    // 5. Forçar reload completo
    console.log('🔄 Forçando reload completo em 2 segundos...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    console.log('✅ [FORCE CLEAN] Limpeza completa concluída!');
    
  } catch (error) {
    console.error('❌ [FORCE CLEAN] Erro na limpeza:', error);
  }
}

// Executar imediatamente
forceCleanEverything();

console.log('🎯 [FORCE CLEAN] Execute também no useStore: useStore.getState().clearZustandPersist()');
