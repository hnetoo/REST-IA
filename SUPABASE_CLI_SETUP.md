# 🔧 Supabase CLI Setup - Tasca do Vereda

## 📋 Configuração Completa

O projeto já está configurado com Supabase CLI para desenvolvimento local e deploy remoto.

## ✅ Configurações Realizadas

### 1. **Inicialização do Projeto**
```bash
npx supabase init
```
- ✅ Criado arquivo `supabase/config.toml`
- ✅ Configurado project_id: `rest-ia-clean`
- ✅ Portas padrão configuradas

### 2. **Link com Projeto Remoto**
```bash
npx supabase link --project-ref tboiuiwlqfzcvakxrsmj
```
- ✅ Conectado ao projeto Supabase
- ✅ Configurado ambiente de desenvolvimento

### 3. **Schema do Banco de Dados**
- ✅ Criado `supabase/schema.sql` completo
- ✅ Todas as tabelas do sistema
- ✅ Row Level Security (RLS) configurado
- ✅ Índices de performance
- ✅ Triggers para timestamps

### 4. **Dados Iniciais**
- ✅ Criado `supabase/seed.sql`
- ✅ Usuários e permissões
- ✅ Menu e categorias
- ✅ Mesas e layout
- ✅ Clientes e funcionários
- ✅ Estoque inicial

## 🚀 Comandos Disponíveis

### Desenvolvimento Local
```bash
# Iniciar serviços locais
npx supabase start

# Parar serviços locais
npx supabase stop

# Resetar banco local
npx supabase db reset

# Ver status
npx supabase status
```

### Gestão de Banco de Dados
```bash
# Fazer push das migrações
npx supabase db push

# Gerar migrações
npx supabase db diff

# Puxar mudanças do remoto
npx supabase db pull

# Seed com dados iniciais
npx supabase db seed
```

### Edge Functions
```bash
# Deploy functions
npx supabase functions deploy

# Servir localmente
npx supabase functions serve

# Listar functions
npx supabase functions list
```

### Autenticação
```bash
# Gerar tipos TypeScript
npx supabase gen types typescript

# Gerar código para auth
npx supabase auth generate
```

## 🌐 Acesso Local

Quando executar `npx supabase start`, você terá acesso a:

- **Studio**: http://localhost:54323
- **API**: http://localhost:54321
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres
- **Storage**: http://localhost:54321/storage/v1
- **Functions**: http://localhost:54321/functions/v1

## 📁 Estrutura de Arquivos

```
supabase/
├── config.toml          # Configuração do CLI
├── schema.sql           # Schema completo do BD
├── seed.sql            # Dados iniciais
├── functions/           # Edge Functions
│   └── sync-state/
│       └── index.ts    # Sincronização de estado
└── migrations/          # Migrações geradas
```

## 🔐 Segurança Configurada

### Row Level Security (RLS)
- ✅ Todas as tabelas com RLS ativado
- ✅ Políticas para usuários autenticados
- ✅ Acesso público para menu digital
- ✅ Proteção contra acessos não autorizados

### Variáveis de Ambiente
- ✅ URL e chaves configuradas
- ✅ Segregação por ambiente
- ✅ Chaves sensíveis protegidas

## 🔄 Fluxo de Trabalho

### 1. Desenvolvimento Local
```bash
# 1. Iniciar serviços
npx supabase start

# 2. Desenvolver com hot reload
npm run dev

# 3. Testar no Studio local
# http://localhost:54323
```

### 2. Deploy para Produção
```bash
# 1. Fazer push das mudanças
npx supabase db push

# 2. Deploy das functions
npx supabase functions deploy

# 3. Verificar no dashboard
# https://app.supabase.com
```

## 📊 Monitoramento

### Logs
```bash
# Ver logs das functions
npx supabase functions logs

# Ver logs da database
npx supabase db logs
```

### Status
```bash
# Ver status completo
npx supabase status --output json
```

## 🛠️ Configurações Avançadas

### Customizar Portas
Edite `supabase/config.toml`:
```toml
[api]
port = 54321  # API

[studio]
port = 54323  # Studio

[db]
port = 54322  # Database
```

### Configurar CORS
```toml
[api]
extra_cors_origins = ["http://localhost:3000", "https://your-app.vercel.app"]
```

### Habilitar Features
```toml
[auth]
enable_signup = true
external_url = "https://your-app.vercel.app"

[storage]
file_size_limit = "50MiB"
```

## 🚨 Troubleshooting

### Problemas Comuns

#### ❌ "Database connection failed"
**Solução**: Verifique se o Supabase está rodando
```bash
npx supabase status
```

#### ❌ "Port already in use"
**Solução**: Mude as portas no config.toml ou finalize processos

#### ❌ "Migration failed"
**Solução**: Verifique o schema SQL e rode:
```bash
npx supabase db reset
npx supabase db push
```

#### ❌ "Function deployment failed"
**Solução**: Verifique sintaxe TypeScript e dependências

### Debug Mode
```bash
# Ver logs detalhados
npx supabase start --debug

# Ver output completo
npx supabase db push --debug
```

## 📚 Documentação Adicional

- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [Database Guide](https://supabase.com/docs/guides/database)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Auth Guide](https://supabase.com/docs/guides/auth)

---

**Status**: ✅ Configurado e pronto para uso
