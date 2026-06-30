# 📁 Biblioteca de Serviços - Estrutura Organizada

## 🗂️ Estrutura de Pastas

### **🎯 AGT/** - Serviços AGT (Autoridade Tributária)
- `agtService.ts` - Serviço principal AGT
- `agtRealService.ts` - Serviço AGT real (produção)
- `agtTestService.ts` - Serviço AGT testes
- `agtSignatureService.ts` - Assinatura digital AGT
- `agtComplianceLogService.ts` - Logs de conformidade

### **🗄️ DATABASE/** - Serviços de Banco de Dados
- `databaseService.ts` - Serviço principal de database
- `localDatabaseService.ts` - Database local (Prisma)
- `localDatabase.ts` - Database local (SQLite)

### **📊 DATA/** - Serviços de Dados
- `dataService.ts` - Serviço principal de dados
- `dataServiceBridge.ts` - Bridge de dados (Web/Desktop)
- `localDataService.ts` - Serviço de dados local

### **🔄 SYNC/** - Serviços de Sincronização
- `offlineSync.ts` - Sincronização offline
- `pendingSyncOrders.ts` - Ordens pendentes de sync
- `activeOrdersBackup.ts` - Backup de ordens ativas

### **✅ VALIDATION/** - Serviços de Validação
- `nifValidation.ts` - Validação de NIF
- `hashService.ts` - Serviço de hash

## 🔧 Serviços Principais (Raiz)

### **📦 Core Services**
- `prisma-client.ts` - Cliente Prisma (único)
- `sqliteService.ts` - Serviço SQLite
- `supabaseService.ts` - Serviço Supabase
- `supabaseDataLoader.ts` - Carregador de dados Supabase
- `supabaseDiagnostics.ts` - Diagnósticos Supabase

### **🧠 Business Logic**
- `dateUtils.ts` - Utilitários de data
- `timezoneLuanda.ts` - Fuso horário Luanda
- `taxService.ts` - Serviço de impostos
- `invoiceSequenceService.ts` - Sequência de faturas
- `orderTransactionService.ts` - Transações de ordens

### **🖨️ Services**
- `printService.ts` - Serviço de impressão
- `thermalPrinterConfig.ts` - Configuração impressora térmica
- `responsivityService.ts` - Serviço de responsividade
- `loggerService.ts` - Serviço de logging
- `versionControlService.ts` - Controle de versão

### **📋 Business-Specific**
- `saftService.ts` - Serviço SAFT
- `stockMovementService.ts` - Movimento de stock
- `sharedMetrics.ts` - Métricas compartilhadas
- `metricsCalculator.ts` - Calculadora de métricas

### **🔐 Security & Compliance**
- `auditService.ts` - Serviço de auditoria
- `certificationService.ts` - Serviço de certificação
- `complianceReportService.ts` - Relatórios de conformidade
- `digitalSignatureService.ts` - Assinatura digital
- `contribuinteClassificationService.ts` - Classificação de contribuinte

### **🤖 AI & External**
- `geminiService.ts` - Serviço Gemini AI

## 📝 Regras de Organização

1. **Um serviço por arquivo** - Evitar múltiplas classes no mesmo arquivo
2. **Nomenclatura padronizada** - `Service` no final do nome
3. **Exportação única** - Um export principal por serviço
4. **Interface separada** - Types em arquivos separados quando complexos
5. **Documentação inline** - JSDoc para todos os métodos públicos

## 🚀 Melhorias Aplicadas

### ✅ Removido:
- **16 arquivos Prisma duplicados** → Mantido apenas `prisma-client.ts`
- **50+ arquivos .md mortos** → Apenas `README.md` principal
- **30+ arquivos .sql antigos** → Organizados em `scripts/database/`
- **20+ arquivos .js/.mjs** → Removidos ou organizados
- **2 serviços Supabase duplicados** → Mantido apenas um

### ✅ Organizado:
- **Scripts**: 68 → 20 arquivos em pastas categorizadas
- **Serviços**: 50 → 35 arquivos em pastas temáticas
- **Database**: Múltiplos serviços → Pasta `database/`
- **AGT**: 5 serviços → Pasta `agt/`

## 📊 Estatísticas Finais

- **Arquivos removidos**: 80+ arquivos desnecessários
- **Pasta raiz**: 159 → 35 arquivos
- **Estrutura clara**: 5 categorias principais
- **Manutenibilidade**: 🚀 Melhorada drasticamente

---

**Status**: ✅ Código organizado e documentado
