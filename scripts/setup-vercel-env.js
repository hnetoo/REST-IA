#!/usr/bin/env node

/**
 * Script para configurar variáveis de ambiente no Vercel
 * Uso: node scripts/setup-vercel-env.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Variáveis obrigatórias
const requiredVars = [
  {
    name: 'VITE_SUPABASE_URL',
    value: 'https://ratzyxwpzrqbtpheygch.supabase.co',
    environments: ['production', 'preview', 'development']
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    value: 'sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo',
    environments: ['production', 'preview', 'development']
  }
];

// Variáveis opcionais
const optionalVars = [
  {
    name: 'VITE_GEMINI_API_KEY',
    value: '',
    environments: ['production', 'preview', 'development'],
    prompt: 'Digite sua API Key do Google Gemini (ou deixe em branco):'
  },
  {
    name: 'NODE_ENV',
    value: 'production',
    environments: ['production']
  },
  {
    name: 'NODE_ENV',
    value: 'preview',
    environments: ['preview']
  },
  {
    name: 'NODE_ENV',
    value: 'development',
    environments: ['development']
  }
];

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setEnvironmentVariable(varName, value, environments) {
  try {
    for (const env of environments) {
      console.log(`📝 Configurando ${varName} para ambiente ${env}...`);
      
      const command = `vercel env add ${varName} ${env}`;
      const child = require('child_process').spawn(command, { 
        shell: true, 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      
      // Enviar o valor
      child.stdin.write(value);
      child.stdin.end();
      
      // Capturar output
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        console.error(`❌ Erro: ${data.toString()}`);
      });
      
      await new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ ${varName} configurado para ${env}`);
            resolve();
          } else {
            reject(new Error(`Falha ao configurar ${varName} para ${env}`));
          }
        });
      });
    }
  } catch (error) {
    console.error(`❌ Erro ao configurar ${varName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Configurando variáveis de ambiente no Vercel...');
  console.log('📋 Projeto: Tasca do Vereda REST IA\n');
  
  try {
    // Verificar se está logado no Vercel
    console.log('🔍 Verificando autenticação Vercel...');
    execSync('vercel whoami', { stdio: 'pipe' });
    console.log('✅ Autenticado no Vercel\n');
  } catch (error) {
    console.error('❌ Você não está logado no Vercel. Execute: vercel login');
    process.exit(1);
  }
  
  // Configurar variáveis obrigatórias
  console.log('⚙️  Configurando variáveis obrigatórias...\n');
  
  for (const varConfig of requiredVars) {
    await setEnvironmentVariable(
      varConfig.name, 
      varConfig.value, 
      varConfig.environments
    );
    console.log('');
  }
  
  // Configurar variáveis opcionais
  console.log('🔧 Configurando variáveis opcionais...\n');
  
  for (const varConfig of optionalVars) {
    let value = varConfig.value;
    
    if (varConfig.prompt) {
      value = await question(varConfig.prompt);
      if (!value.trim()) {
        console.log(`⏭️  Pulando ${varConfig.name} (valor em branco)`);
        continue;
      }
    }
    
    await setEnvironmentVariable(
      varConfig.name,
      value,
      varConfig.environments
    );
    console.log('');
  }
  
  console.log('✨ Variáveis de ambiente configuradas com sucesso!');
  console.log('🔄 Faça um novo deploy para aplicar as alterações:');
  console.log('   vercel --prod');
  
  rl.close();
}

// Tratar erros
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erro não tratado:', reason);
  rl.close();
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Falha na configuração:', error.message);
  rl.close();
  process.exit(1);
});
