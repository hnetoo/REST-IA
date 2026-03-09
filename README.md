<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Tasca do Vereda - Sistema de Gestão Inteligente

Sistema completo de gestão para restaurantes com IA integrada, desenvolvido em React + TypeScript + Tauri.

## 🚀 Deploy no Vercel

### Configuração Rápida

1. **Variáveis de Ambiente Obrigatórias:**
   ```bash
   VITE_SUPABASE_URL=https://tboiuiwlqfzcvakxrsmj.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm
   ```

2. **Setup Automático:**
   ```bash
   # Instalar Vercel CLI
   npm i -g vercel
   
   # Configurar variáveis automaticamente
   node scripts/setup-vercel-env.js
   
   # Deploy para produção
   vercel --prod
   ```

3. **Configuração Manual:**
   - Veja [VERCEL_ENV_SETUP.md](VERCEL_ENV_SETUP.md)
   - Configure no dashboard Vercel > Settings > Environment Variables

### Documentação

- 📖 [Deployment completo](DEPLOYMENT.md)
- 🔧 [Configuração de ambiente](VERCEL_ENV_SETUP.md)
- ✅ [Checklist de deployment](DEPLOYMENT_CHECKLIST.md)

## 🏃‍♂️ Executar Localmente

**Pré-requisitos:** Node.js 18+

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   cp .env.example .env.local
   # Editar .env.local com suas chaves
   ```

3. **Executar aplicação:**
   ```bash
   npm run dev
   ```

4. **Executar versão desktop (Tauri):**
   ```bash
   npm run desktop
   ```

## 📦 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run build:vercel # Build otimizado para Vercel
npm run desktop      # Versão desktop Tauri
npm run preview      # Preview do build
npm run test         # Executar testes
```

## 🛠️ Stack Tecnológico

- **Frontend:** React 18, TypeScript, TailwindCSS
- **State Management:** Zustand com persistência
- **Desktop:** Tauri (Rust backend)
- **Database:** SQLite + Supabase (cloud)
- **Build Tool:** Vite
- **Deployment:** Vercel

## 📱 Funcionalidades

- 🍽️ **Terminal POS** completo
- 🗺️ **Mapa de sala** interativo
- 📱 **Menu digital** público
- 📊 **Dashboard** analytics
- 👥 **Gestão de equipe**
- 📦 **Controle de estoque**
- 💰 **Financeiro**
- 🔐 **Sistema de permissões**
- 🤖 **Análise com IA**

## 🔐 Segurança

- Autenticação por PIN
- Sistema de permissões granular
- Row Level Security (Supabase)
- Headers de segurança configurados
- Variáveis de ambiente isoladas

## 📞 Suporte

- [Documentação Vercel](https://vercel.com/docs)
- [Community Discord](https://discord.gg/vercel)
- [GitHub Issues](https://github.com/vercel/vercel/issues)

---

**Desenvolvido com ❤️ para restaurantes modernos**
