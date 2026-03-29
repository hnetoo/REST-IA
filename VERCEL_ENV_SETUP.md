# 🔧 Configurar Variáveis de Ambiente no Vercel

## 📋 Passo a Passo

### 1. Acessar Dashboard Vercel
1. Faça login em [vercel.com](https://vercel.com)
2. Selecione seu projeto "tasca-do-vereda"
3. Clique na aba **Settings**

### 2. Configurar Environment Variables
1. No menu lateral, clique em **Environment Variables**
2. Adicione as variáveis uma por uma:

#### 🔑 **Variáveis Obrigatórias**

| Nome da Variável | Valor | Ambiente |
|------------------|-------|-----------|
| `VITE_SUPABASE_URL` | `https://ratzyxwpzrqbtpheygch.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo` | Production, Preview, Development |

#### 🤖 **Variáveis Opcionais (IA)**

| Nome da Variável | Valor | Ambiente |
|------------------|-------|-----------|
| `VITE_GEMINI_API_KEY` | `sua_chave_gemini_aqui` | Production, Preview, Development |

#### ⚙️ **Variáveis de Configuração**

| Nome da Variável | Valor | Ambiente |
|------------------|-------|-----------|
| `NODE_ENV` | `production` | Production |
| `NODE_ENV` | `preview` | Preview |
| `NODE_ENV` | `development` | Development |

### 3. Salvar e Deploy
1. Clique em **Save** após adicionar cada variável
2. Aguarde o processo de save
3. Faça um novo deploy para aplicar as variáveis:
   ```bash
   vercel --prod
   ```

## 🚨 **Importante**

### Segurança
- **Nunca** exponha chaves privadas no frontend
- Use apenas chaves **anônimas** do Supabase
- Configure Row Level Security (RLS) no Supabase

### Ambientes
- **Production**: Para deploy principal
- **Preview**: Para PRs e testes
- **Development**: Para testes locais

## 🔍 **Verificação**

### Testar Localmente
```bash
# Instalar Vercel CLI
npm i -g vercel

# Pull variables para ambiente local
vercel env pull .env.local

# Testar build
npm run build:vercel
```

### Verificar no Deploy
1. Após o deploy, abra a aplicação
2. Verifique o console do browser
3. Procure por erros de conexão com Supabase
4. Teste o login e funcionalidades

## 🛠️ **Troubleshooting**

### Erros Comuns

#### ❌ "Supabase not configured"
**Causa**: Variáveis não configuradas corretamente
**Solução**: Verifique nomes e valores das variáveis

#### ❌ "Invalid API key"
**Causa**: Chave do Supabase incorreta
**Solução**: Use a chave anônima correta

#### ❌ "CORS error"
**Causa**: Configuração de CORS no Supabase
**Solução**: Adicione o domínio Vercel ao CORS do Supabase

### Debug
```javascript
// Verificar variáveis no browser
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured' : 'Missing');
```

## 📱 **Configuração Supabase CORS**

1. Acesse o dashboard Supabase
2. Vá para **Settings** > **API**
3. Em **Additional Headers**, adicione:
   ```
   Access-Control-Allow-Origin: https://your-app-name.vercel.app
   ```

## 🔄 **Variáveis por Ambiente**

### Production
```bash
VITE_SUPABASE_URL=https://ratzyxwpzrqbtpheygch.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo
NODE_ENV=production
```

### Preview
```bash
VITE_SUPABASE_URL=https://ratzyxwpzrqbtpheygch.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo
NODE_ENV=preview
```

### Development
```bash
VITE_SUPABASE_URL=https://ratzyxwpzrqbtpheygch.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo
NODE_ENV=development
```

## ✅ **Checklist Final**

- [ ] Variáveis obrigatórias configuradas
- [ ] Chaves do Supabase são anônimas (não service role)
- [ ] CORS configurado no Supabase
- [ ] Deploy realizado após configuração
- [ ] Funcionalidades testadas em produção
- [ ] Logs verificados para erros

---

**Suporte**: [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
