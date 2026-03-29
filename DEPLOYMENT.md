# Deploy para Vercel

## 🚀 Configuração Automática

O projeto já está configurado para deployment automático no Vercel com os seguintes arquivos:

- `vercel.json` - Configuração de build e routing
- `.vercelignore` - Arquivos ignorados no deployment
- `package.json` - Scripts de build otimizados

## 📋 Pré-requisitos

1. **Conta Vercel**: Crie uma conta em [vercel.com](https://vercel.com)
2. **GitHub Repository**: O projeto deve estar no GitHub
3. **Variáveis de Ambiente**: Configure no dashboard Vercel

## 🔧 Variáveis de Ambiente

Configure estas variáveis no dashboard Vercel (Settings > Environment Variables):

### Obrigatórias
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Opcionais
```
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## 🚀 Deploy Automático

### Método 1: GitHub Integration (Recomendado)

1. Conecte seu repositório GitHub ao Vercel
2. O Vercel detectará automaticamente o projeto React
3. Configure as variáveis de ambiente
4. Clique em "Deploy"

### Método 2: Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Deploy do projeto
vercel --prod
```

## 🌐 Rotas Configuradas

O `vercel.json` já configura as seguintes rotas:

- `/` - Aplicação principal
- `/menu-digital` - Menu digital público
- `/customer-display/:tableId` - Display para clientes
- Todas as outras rotas - SPA fallback para `index.html`

## 🔒 Segurança

Headers de segurança configurados:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📱 Performance

- Cache otimizado para assets estáticos (1 ano)
- Build otimizado para produção
- Compressão automática via Vercel

## 🔄 Deploy Contínuo

Com a integração GitHub, cada push para a branch `main` acionará automaticamente um novo deploy.

## 🐛 Debug

### Ver Logs
1. Vá ao dashboard Vercel
2. Selecione o projeto
3. Clique na aba "Logs"
4. Filtre por timestamp ou função

### Build Errors
1. Verifique as variáveis de ambiente
2. Confirme que todas as dependências estão em `package.json`
3. Verifique o console output no dashboard Vercel

### Runtime Errors
1. Use o Vercel Speed Insights
2. Verifique o browser console
3. Monitore com Vercel Analytics

## 🌍 Domínio Personalizado

1. Vá para Settings > Domains
2. Adicione seu domínio
3. Configure DNS conforme instruções
4. Aguarde propagação (até 24h)

## 📊 Monitoramento

O Vercel oferece:
- **Analytics**: Tráfego e performance
- **Speed Insights**: Core Web Vitals
- **Logs**: Em tempo real
- **Error Tracking**: Integrado

## 🚨 Rollback

Se algo der errado:
1. Vá para a aba "Deployments"
2. Encontre o último deployment funcional
3. Clique nos três pontos > "Promote to Production"

## 💡 Dicas Adicionais

1. **Preview Deployments**: Cada PR cria um preview automático
2. **Branch Aliases**: Configure domínios para branches específicas
3. **Edge Functions**: Para features serverless no futuro
4. **Image Optimization**: Use o domínio Vercel para imagens otimizadas

## 🆘 Suporte

- **Documentação Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Status Page**: [vercel-status.com](https://vercel-status.com)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
