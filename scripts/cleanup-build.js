const fs = require('fs');
const path = require('path');

// 🧹 SCRIPT DE LIMPEZA PÓS-BUILD
console.log('[CLEANUP] 🧹 Iniciando limpeza pós-build...');

const projectRoot = __dirname;
const distInstallersPath = path.join(projectRoot, '..', 'dist/installers');

try {
  // 📁 Verificar se a pasta de instaladores existe
  if (fs.existsSync(distInstallersPath)) {
    const files = fs.readdirSync(distInstallersPath);
    
    files.forEach(file => {
      const filePath = path.join(distInstallersPath, file);
      const stat = fs.statSync(filePath);
      
      // 🗑️ Remover pasta win-unpacked se existir
      if (stat.isDirectory() && file === 'win-unpacked') {
        console.log(`[CLEANUP] 🗑️ Removendo pasta temporária: ${file}`);
        fs.rmSync(filePath, { recursive: true, force: true });
      }
      
      // 🗑️ Remover pasta .icon-ico se existir
      if (stat.isDirectory() && file === '.icon-ico') {
        console.log(`[CLEANUP] 🗑️ Removendo pasta temporária: ${file}`);
        fs.rmSync(filePath, { recursive: true, force: true });
      }
      
      // 🗑️ Remover arquivos de configuração YAML
      if (file.includes('.yml') || file.includes('.yaml')) {
        console.log(`[CLEANUP] 🗑️ Removendo arquivo de configuração: ${file}`);
        fs.unlinkSync(filePath);
      }
    });
    
    // 📋 Listar arquivos finais
    console.log('\n[CLEANUP] 📋 Arquivos finais na pasta dist/installers:');
    const finalFiles = fs.readdirSync(distInstallersPath);
    finalFiles.forEach(file => {
      const filePath = path.join(distInstallersPath, file);
      const stat = fs.statSync(filePath);
      const size = stat.isDirectory() ? '[DIR]' : `${(stat.size / 1024 / 1024).toFixed(2)} MB`;
      console.log(`   📦 ${file} (${size})`);
    });
    
    console.log('\n[CLEANUP] ✅ Limpeza concluída com sucesso!');
    console.log('[CLEANUP] 🎯 Apenas o instalador final foi mantido.');
    
  } else {
    console.log('[CLEANUP] ⚠️ Pasta dist/installers não encontrada.');
  }
  
} catch (error) {
  console.error('[CLEANUP] ❌ Erro durante a limpeza:', error.message);
  process.exit(1);
}
