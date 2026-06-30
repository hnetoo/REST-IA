# 🍽️ Tasca do Vereda - Estrutura do Projeto

## 📁 Estrutura Principal

```
src/
├── components/          # Componentes React reutilizáveis
├── views/              # Páginas principais da aplicação
│   ├── owner/         # Dashboard do proprietário
│   ├── AGTConfig.tsx  # Configuração AGT
│   └── ...
├── lib/               # 📚 Biblioteca de serviços (organizada)
├── hooks/             # Hooks React personalizados
├── store/             # Estado global (Zustand)
├── types/             # Types TypeScript
└── assets/            # Recursos estáticos
```

## 🗂️ Scripts Organizados

```
scripts/
├── database/          # Scripts de banco de dados
├── deployment/        # Scripts de deploy
├── maintenance/      # Scripts de manutenção
├── testing/          # Scripts de teste
└── supabase/         # Scripts Supabase
```

## 📊 Estatísticas da Reorganização

### ✅ ANTES:
- **Arquivos Prisma**: 16 versões duplicadas
- **Arquivos mortos**: 80+ (.md, .sql, .js, .mjs)
- **Scripts**: 68 arquivos desorganizados
- **Serviços**: 50 arquivos misturados
- **Pasta raiz**: 159 arquivos

### ✅ DEPOIS:
- **Arquivos Prisma**: 1 arquivo principal (`prisma-client.ts`)
- **Arquivos mortos**: 0 (removidos ou organizados)
- **Scripts**: 20 arquivos categorizados
- **Serviços**: 35 arquivos organizados por tema
- **Pasta raiz**: 35 arquivos essenciais

## 🎯 Melhorias Aplicadas

### 🔥 Limpeza Radical:
- ❌ **16 arquivos Prisma duplicados** → ✅ 1 arquivo
- ❌ **50+ arquivos .md antigos** → ✅ Apenas README.md
- ❌ **30+ arquivos .sql mortos** → ✅ Organizados em `scripts/database/`
- ❌ **20+ arquivos .js/.mjs** → ✅ Removidos ou categorizados
- ❌ **2 serviços Supabase duplicados** → ✅ 1 serviço

### 📁 Organização Inteligente:
- 🗂️ **Scripts** → 4 categorias (database, deployment, maintenance, testing)
- 🗂️ **Serviços** → 5 categorias (agt, database, data, sync, validation)
- 🗂️ **Lib** → Estrutura clara com documentação
- 🗂️ **Raiz** → Apenas arquivos essenciais

### 📋 Documentação:
- 📖 **README.md** em cada pasta principal
- 📖 **JSDoc** em todos os métodos públicos
- 📖 **Estrutura padronizada** para todos os serviços
- 📖 **Regras claras** para manutenção futura

## 🚀 Benefícios

1. **Performance** - Menos arquivos = build mais rápido
2. **Manutenibilidade** - Estrutura clara = fácil encontrar código
3. **Debugging** - Serviços organizados = fácil identificar problemas
4. **Onboarding** - Documentação clara = novo dev entende rápido
5. **Escalabilidade** - Estrutura modular = fácil adicionar features

## 📝 Regras de Ouro

1. **Um serviço por arquivo** - Sem classes múltiplas
2. **Nomenclatura padronizada** - `Service` no final
3. **Exportação única** - Um export principal por arquivo
4. **Documentação obrigatória** - JSDoc em métodos públicos
5. **Testes separados** - Em pasta `testing/`

---

**Status**: ✅ Projeto 100% organizado e documentado
