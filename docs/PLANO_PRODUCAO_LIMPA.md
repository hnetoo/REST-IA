# 🎯 Plano de Produção Limpa - REST-IA

## 📋 RESUMO EXECUTIVO

Sistema seguro de **reset para produção** com dois cenários:
1. **Cenário A (Tasca do Vereda)**: Manter estrutura, limpar dados operacionais
2. **Cenário B (Novo Cliente)**: Reset total com dados padrão

---

## 🗄️ TABELAS SUPABASE - CATEGORIZAÇÃO

### 🟢 ESTRUTURA (Manter sempre)
| Tabela | Tipo | Descrição |
|--------|------|-----------|
| `categories` | Estrutura | Categorias de produtos |
| `menu_items` | Estrutura | Produtos do cardápio |
| `pos_tables` | Estrutura | Configuração das mesas |
| `payment_methods` | Estrutura | Métodos de pagamento |
| `app_settings` | Config | Configurações do sistema |

### 🔴 DADOS OPERACIONAIS (Limpar)
| Tabela | Tipo | Descrição |
|--------|------|-----------|
| `orders` | Operacional | Pedidos/faturas |
| `order_items` | Operacional | Itens dos pedidos |
| `expenses` | Financeiro | Despesas |
| `cash_flow` | Financeiro | Fluxo de caixa |
| `staff` | Pessoal | Funcionários |
| `attendance` | Pessoal | Assiduidade |
| `purchase_requests` | Operacional | Pedidos de compra |
| `external_history` | Financeiro | Histórico externo |
| `reservations` | Operacional | Reservas |

---

## 📊 CENÁRIOS DE LIMPEZA

### 🎯 CENÁRIO A: Tasca do Vereda (Atual)
**Objetivo**: Manter categorias/produtos, limpar dados financeiros

**Manter**:
- ✅ Categorias existentes
- ✅ Produtos/menu_items
- ✅ Configuração de mesas
- ✅ Métodos de pagamento
- ✅ Usuários (owner, admin)

**Limpar**:
- ❌ Todas as orders (vendas antigas)
- ❌ Todas as despesas
- ❌ Cash flow
- ❌ Staff/funcionários
- ❌ Compras pendentes/aprovadas
- ❌ Histórico externo

### 🎯 CENÁRIO B: Novo Cliente (Do Zero)
**Objetivo**: Sistema limpo com dados padrão

**Manter**:
- ✅ Estrutura de tabelas vazias
- ✅ Dados padrão (mesas, categorias exemplo)

**Limpar**:
- ❌ TUDO exceto configuração base

---

## 🔧 SCRIPTS DE LIMPEZA

### Script 1: Backup de Segurança
```javascript
// backup-production.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://tboiuiwlqfzcvakxrsmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

async function backupAll() {
  const tables = [
    'categories', 'menu_items', 'pos_tables',
    'orders', 'order_items', 'expenses', 
    'cash_flow', 'staff', 'attendance',
    'purchase_requests', 'external_history',
    'reservations'
  ];
  
  const backup = {};
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (!error) backup[table] = data;
  }
  
  const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`✅ Backup salvo: ${filename}`);
}

backupAll();
```

### Script 2: Cenário A - Tasca (Manter Estrutura)
```javascript
// reset-tasca-scenario.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tboiuiwlqfzcvakxrsmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

async function resetTasca() {
  console.log('🧹 Iniciando limpeza Tasca do Vereda...\n');
  
  // 1. Limpar Orders e Order Items
  await supabase.from('order_items').delete().neq('id', '0');
  await supabase.from('orders').delete().neq('id', '0');
  console.log('✅ Orders e itens removidos');
  
  // 2. Limpar Financeiro
  await supabase.from('expenses').delete().neq('id', '0');
  await supabase.from('cash_flow').delete().neq('id', '0');
  await supabase.from('external_history').delete().neq('id', '0');
  console.log('✅ Dados financeiros removidos');
  
  // 3. Limpar Staff
  await supabase.from('attendance').delete().neq('id', '0');
  await supabase.from('staff').delete().neq('id', '0');
  console.log('✅ Dados de pessoal removidos');
  
  // 4. Limpar Compras
  await supabase.from('purchase_requests').delete().neq('id', '0');
  console.log('✅ Pedidos de compra removidos');
  
  // 5. Limpar Reservas
  await supabase.from('reservations').delete().neq('id', '0');
  console.log('✅ Reservas removidas');
  
  console.log('\n🎯 Limpeza concluída!');
  console.log('📊 Estrutura mantida:');
  console.log('   • Categorias (preservadas)');
  console.log('   • Produtos/Menu (preservados)');
  console.log('   • Mesas (preservadas)');
  console.log('   • Configurações (preservadas)');
}

resetTasca();
```

### Script 3: Cenário B - Novo Cliente (Reset Total)
```javascript
// reset-new-client.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tboiuiwlqfzcvakxrsmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

const DEFAULT_CATEGORIES = [
  { name: 'Bebidas', icon: '🥤', sort_order: 1 },
  { name: 'Entradas', icon: '🥗', sort_order: 2 },
  { name: 'Pratos Principais', icon: '🍽️', sort_order: 3 },
  { name: 'Sobremesas', icon: '🍰', sort_order: 4 }
];

const DEFAULT_TABLES = [
  { name: 'Mesa 1', number: 1, x: 100, y: 100, capacity: 4 },
  { name: 'Mesa 2', number: 2, x: 300, y: 100, capacity: 4 },
  { name: 'Mesa 3', number: 3, x: 500, y: 100, capacity: 2 },
  { name: 'Mesa 4', number: 4, x: 700, y: 100, capacity: 6 },
  { name: 'Bar', number: 99, x: 400, y: 300, capacity: 8 }
];

const DEFAULT_PRODUCTS = [
  { name: 'Coca-Cola', price: 200, category_id: null, is_active: true },
  { name: 'Água', price: 150, category_id: null, is_active: true },
  { name: 'Bruschetta', price: 800, category_id: null, is_active: true }
];

async function resetNewClient() {
  console.log('🆕 Configurando novo cliente...\n');
  
  // 1. Limpar TUDO
  const tablesToClear = [
    'order_items', 'orders', 'expenses', 'cash_flow',
    'attendance', 'staff', 'purchase_requests', 
    'external_history', 'reservations', 'menu_items',
    'categories', 'pos_tables'
  ];
  
  for (const table of tablesToClear) {
    await supabase.from(table).delete().neq('id', '0');
    console.log(`🗑️ ${table} limpo`);
  }
  
  // 2. Criar Categorias Padrão
  const { data: cats } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES)
    .select();
  console.log('✅ Categorias padrão criadas');
  
  // 3. Criar Mesas Padrão
  await supabase.from('pos_tables').insert(DEFAULT_TABLES);
  console.log('✅ Mesas padrão criadas');
  
  // 4. Criar Produtos Padrão (associados à primeira categoria)
  if (cats && cats[0]) {
    const productsWithCat = DEFAULT_PRODUCTS.map(p => ({
      ...p,
      category_id: cats[0].id
    }));
    await supabase.from('menu_items').insert(productsWithCat);
    console.log('✅ Produtos padrão criados');
  }
  
  console.log('\n🎉 Novo cliente pronto para produção!');
}

resetNewClient();
```

---

## 🖥️ LIMPEZA LOCAL (Windows/Electron)

### Script para Limpar SQLite Local
```javascript
// clear-local-data.js
// Executar na consola do Electron ou como script preload

async function clearLocalData() {
  if (window.electronAPI) {
    // Electron - usar IPC
    await window.electronAPI.clearAllLocalData();
    console.log('✅ Dados locais limpos');
  } else {
    // Web - usar localStorage
    localStorage.removeItem('tasca_vereda_storage_v6');
    localStorage.removeItem('pos_data_cache');
    console.log('✅ localStorage limpo');
  }
}

// Forçar refresh após limpeza
window.location.reload();
```

---

## 🔒 CHECKLIST DE SEGURANÇA

### Antes da Limpeza
- [ ] Fazer backup completo do Supabase
- [ ] Exportar dados importantes (se necessário)
- [ ] Verificar versão da app (Windows + Web)
- [ ] Notificar utilizadores sobre manutenção

### Durante a Limpeza
- [ ] Executar scripts em ambiente de teste primeiro
- [ ] Validar cada etapa antes de prosseguir
- [ ] Manter logs de todas as operações

### Após a Limpeza
- [ ] Testar login na app Windows
- [ ] Testar login na app Web
- [ ] Verificar se categorias aparecem
- [ ] Verificar se produtos aparecem
- [ ] Testar criar uma venda de teste
- [ ] Testar criar uma despesa de teste
- [ ] Verificar dashboard atualiza
- [ ] Testar sincronização offline → online

---

## 📱 VALIDAÇÃO PÓS-LIMPEZA

### Testes Obrigatórios

1. **App Windows (Electron)**
   ```
   ✓ Abrir app sem erros
   ✓ Fazer login
   ✓ Ver categorias no POS
   ✓ Criar pedido
   ✓ Fechar pedido (venda)
   ✓ Verificar Dashboard atualiza
   ✓ Criar despesa
   ✓ Verificar Financeiro
   ```

2. **App Web (Vercel)**
   ```
   ✓ Abrir no browser
   ✓ Sincronizar dados
   ✓ Mesmos dados que Windows
   ```

---

## 🚀 PROCEDIMENTO RECOMENDADO

### Para Tasca do Vereda (Cenário A):

```bash
# 1. Backup
node backup-production.js

# 2. Limpar dados operacionais
node reset-tasca-scenario.js

# 3. Limpar SQLite local (se houver)
# Na app Windows: DevTools → Console → clearLocalData()

# 4. Testar
# Abrir app e verificar se tudo funciona
```

### Para Novo Cliente (Cenário B):

```bash
# 1. Backup (sempre!)
node backup-production.js

# 2. Reset total
node reset-new-client.js

# 3. Configurar personalizado
# - Adicionar logo
# - Ajustar cores
# - Configurar métodos de pagamento

# 4. Testar completamente
```

---

## ⚠️ ATENÇÃO - PONTOS CRÍTICOS

### NUNCA APAGAR:
1. **Tabela `categories` vazia** → POS não mostra produtos
2. **Tabela `menu_items` vazia** → Não há o que vender
3. **Tabela `pos_tables` vazia** → Não há mesas no layout
4. **Configurações essenciais** → App pode crashar

### SEMPRE VERIFICAR:
1. **Foreign Keys** → Orders precisam de mesas válidas
2. **Real-time subscriptions** → Reiniciar após limpeza
3. **Cache local** → Limpar no Windows para evitar conflitos

---

## 📞 SUPORTE

Se algo correr mal:
1. Restaurar backup do Supabase
2. Limpar localStorage/SQLite nos dispositivos
3. Recarregar apps
4. Sincronizar novamente

---

**Criado em**: 2026-04-01
**Versão**: 1.0
**Próximo passo**: Escolher cenário e executar backup
