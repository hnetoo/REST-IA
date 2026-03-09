# 🚀 Deployment Checklist - Vercel

## ✅ Pré-Deployment

### Ambiente Local
- [ ] Node.js instalado (v18+)
- [ ] Vercel CLI instalado (`npm i -g vercel`)
- [ ] Login no Vercel (`vercel login`)
- [ ] Projeto versionado no Git

### Código
- [ ] Código commitado na branch correta
- [ ] Testes passando (`npm test`)
- [ ] Build local funcionando (`npm run build:vercel`)
- [ ] Sem console.log() ou debug statements
- [ ] Variáveis de ambiente configuradas

### Variáveis de Ambiente (Vercel Dashboard)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_GEMINI_API_KEY` (opcional)

## 🔧 Configuração Vercel

### Project Settings
- [ ] Framework preset: `Vite`
- [ ] Build Command: `npm run build:vercel`
- [ ] Output Directory: `dist`
- [ ] Node.js Version: `18.x` ou superior

### Domains
- [ ] Domínio principal configurado
- [ ] DNS records atualizados
- [ ] SSL certificate ativo

## 🚀 Deployment Process

### 1. Deploy de Teste (Preview)
```bash
# Via CLI
vercel

# Via PowerShell
.\scripts\deploy.ps1 preview

# Via Bash
./scripts/deploy.sh preview
```

### 2. Verificação Pós-Deploy
- [ ] Aplicação carrega corretamente
- [ ] Login funciona
- [ ] Supabase connection OK
- [ ] Menu digital funciona
- [ ] Customer display funciona
- [ ] Sem erros no console

### 3. Deploy de Produção
```bash
# Via CLI
vercel --prod

# Via PowerShell
.\scripts\deploy.ps1 production

# Via Bash
./scripts/deploy.sh production
```

## 📋 Verificação Pós-Produção

### Funcionalidades Críticas
- [ ] Login com PIN funciona
- [ ] Dashboard carrega dados
- [ ] Terminal POS funcional
- [ ] Mapa de sala interativo
- [ ] Menu digital público acessível
- [ ] Backup/Sync com Supabase

### Performance
- [ ] Lighthouse score > 90
- [ ] Tempo de carregamento < 3s
- [ ] Sem memory leaks
- [ ] Imagens otimizadas

### Segurança
- [ ] HTTPS funcionando
- [ ] Headers de segurança ativos
- [ ] Sem dados sensíveis expostos
- [ ] CORS configurado

## 🔄 Monitoramento Contínuo

### Vercel Dashboard
- [ ] Analytics configurado
- [ ] Speed Insights ativo
- [ ] Logs sendo coletados
- [ ] Error tracking ativo

### Alertas
- [ ] Notificações de erro configuradas
- [ ] Monitoramento de uptime ativo
- [ ] Performance alerts configurados

## 🚨 Rollback Plan

### Situações de Rollback
- [ ] Erros críticos em produção
- [ ] Performance degradation
- [ ] Security issues
- [ ] Data corruption

### Processo de Rollback
1. Identificar último deploy estável
2. Vá para Vercel > Deployments
3. Encontre o deploy funcional
4. Clique "..." > "Promote to Production"
5. Verificar funcionamento

## 📊 Documentação

### Pós-Deployment
- [ ] Atualizar changelog
- [ ] Documentar novas features
- [ ] Comunicar mudanças à equipe
- [ ] Atualizar README se necessário

### Manutenção
- [ ] Agendar updates regulares
- [ ] Monitor dependências
- [ ] Backup documentation
- [ ] Test plan atualizado

## 🆘 Troubleshooting Comum

### Build Errors
- Verificar package.json
- Limpar cache: `rm -rf node_modules && npm install`
- Verificar variáveis de ambiente

### Runtime Errors
- Check browser console
- Verificar Vercel logs
- Testar em modo incognito
- Verificar CORS settings

### Performance Issues
- Otimizar imagens
- Implementar lazy loading
- Reduzir bundle size
- Ativar caching

---

## 📞 Contatos Suporte

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Status Page**: [vercel-status.com](https://vercel-status.com)
- **Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

---

**Última atualização**: $(date)
**Versão**: v1.0.5
