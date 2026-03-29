const fs = require('fs');
const path = require('path');

// 🧹 SCRIPT PREBUILD - LIMPEZA AUTOMÁTICA
console.log('[PREBUILD] 🧹 Iniciando limpeza pré-build...');

const projectRoot = __dirname;
const foldersToClean = [
  'dist',
  'out', 
  'release',
  'dist-electron',
  'dist/installers'
];

try {
  foldersToClean.forEach(folder => {
    const folderPath = path.join(projectRoot, folder);
    
    if (fs.existsSync(folderPath)) {
      console.log(`[PREBUILD] 🗑️ Removendo pasta: ${folder}`);
      fs.rmSync(folderPath, { recursive: true, force: true });
    } else {
      console.log(`[PREBUILD] ✅ Pasta não existe (ok): ${folder}`);
    }
  });
  
  console.log('\n[PREBUILD] ✅ Limpeza pré-build concluída!');
  console.log('[PREBUILD] 🎯 Ambiente limpo para build do MSI');
  
} catch (error) {
  console.error('[PREBUILD] ❌ Erro durante limpeza:', error.message);
  process.exit(1);
}
