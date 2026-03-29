# RECUPERAÇÃO DE PRODUTOS CORROMPIDOS

## 🚨 PROBLEMA CRÍTICO IDENTIFICADO

**ALERTA:** O catálogo de produtos foi corrompido:
- ❌ Todos os produtos foram movidos para "Bebidas"
- ❌ URLs das imagens desapareceram (image_url: null)
- ❌ Incompatibilidade de campos entre localStorage e Supabase

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Serviço de Recuperação (`productRecoveryService.ts`)
- Analisa estado atual dos dados
- Identifica produtos corrompidos
- Restaura estrutura original
- Mantém compatibilidade Supabase

### 2. Interface de Recuperação (`ProductRecoveryButton.tsx`)
- Botão de verificação de estado
- Recuperação automática com um clique
- Relatório detalhado das correções
- Feedback visual do processo

### 3. Integração no POS
- Adicionado à interface principal do POS
- Acesso fácil para administradores
- Seguro: apenas executa quando solicitado

## 📋 ESTRUTURA CORRETA ESPERADA

### Categorias Originais:
- `cat_entradas` → "Entradas"
- `cat_principais` → "Pratos Principais"  
- `cat_bebidas` → "Bebidas"
- `cat_sobremesas` → "Sobremesas"

### Produtos com Categorias Corretas:
- "Mufete de Peixe" → `cat_principais`
- "Moamba de Galinha" → `cat_principais`
- "Kitaba (Petisco)" → `cat_entradas`
- "Cuca (Lata)" → `cat_bebidas`
- "Doce de Ginguba" → `cat_sobremesas`

### Campos de Imagem:
- **LocalStore:** `image` (URL completa Unsplash)
- **Supabase:** `image_url` (mesma URL)

## 🔧 COMO USAR A RECUPERAÇÃO

### Passo 1: Acessar o Sistema
1. Abra: http://localhost:5173
2. Faça login com PIN: `1234` (Gerente)
3. Vá para a tela POS (mesas)

### Passo 2: Verificar Estado
1. No topo da tela POS, procure "Recuperação de Produtos"
2. Clique em **"Verificar Estado"**
3. Analise o relatório de corrupção

### Passo 3: Executar Recuperação
1. Se detectar corrupção, clique em **"Recuperar Produtos"**
2. Aguarde o processo completar
3. App irá recarregar automaticamente

### Passo 4: Verificar Resultado
1. Confirme categorias corretas
2. Verifique imagens visíveis
3. Teste funcionamento normal

## 🛡️ MEDIDAS DE SEGURANÇA

### Antes da Recuperação:
- ✅ Backup automático criado
- ✅ Análise completa do estado
- ✅ Confirmação do usuário

### Durante a Recuperação:
- ✅ Processo reversível
- ✅ Logs detalhados
- ✅ Validação de integridade

### Após a Recuperação:
- ✅ Reload automático
- ✅ Verificação de sucesso
- ✅ Notificação de conclusão

## 📊 ESTRUTURA DE DADOS

### Supabase (products table):
```sql
- id (string)
- name (string)  
- price (number)
- category_id (string) ← FK para categories.id
- image_url (string) ← URL da imagem
- description (string)
- is_active (boolean)
- is_available (boolean)
- created_at, updated_at
```

### LocalStore (Dish interface):
```typescript
- id: string
- name: string
- price: number
- categoryId: string ← Compatible
- image: string ← Compatible  
- description: string
- isVisibleDigital: boolean
- isFeatured: boolean
```

## 🔄 COMPATIBILIDADE GARANTIDA

O sistema mantém **compatibilidade total**:
- ✅ Campos duplicados para ambos os sistemas
- ✅ Sincronização automática Supabase
- ✅ Funcionamento offline/local
- ✅ Preservação de dados existentes

## 🚨 PREVENÇÃO FUTURA

### Causas Prováveis da Corrupção:
1. Scripts de migração incompletos
2. Edição manual direta do DB
3. Conflito entre schemas
4. Sync interrompido

### Medidas Preventivas:
1. Validação antes de salvar
2. Backup automático frequente  
3. Logs de alterações
4. Testes de integridade

---

## 📞 SUPORTE

**Se o problema persistir:**
1. Verifique logs no console
2. Confirme permissões do Supabase
3. Teste com dados limpos
4. Contacte suporte técnico

**Status:** ✅ **SOLUÇÃO IMPLEMENTADA E PRONTA**
