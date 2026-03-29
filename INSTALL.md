# 🚀 Tasca Do Vereda - Instalação Produção

## 📦 Pacotes Disponíveis

### 🏢 **MSI para Windows (Recomendado)**
- **Arquivo:** `Tasca Do Vereda_1.0.5_x64_pt-PT.msi`
- **Tamanho:** 5.7 MB
- **Localização:** `src-tauri/target/release/bundle/msi/`
- **Requisitos:** Windows 10/11 x64

### 💻 **Executável Portátil**
- **Arquivo:** `tasca-do-vereda.exe`
- **Tamanho:** 15 MB
- **Localização:** `src-tauri/target/release/`
- **Requisitos:** Windows 10/11 x64

## 🔧 **Instalação MSI**

### Passo 1: Download
```bash
# Copiar arquivo MSI para máquina local
cp "src-tauri/target/release/bundle/msi/Tasca Do Vereda_1.0.5_x64_pt-PT.msi" ./
```

### Passo 2: Instalação
1. **Clique duplo** no arquivo `Tasca Do Vereda_1.0.5_x64_pt-PT.msi`
2. **Aceite** o contrato de licença
3. **Selecione** pasta de instalação (recomendado: `C:\Program Files\Tasca Do Vereda`)
4. **Clique** em Instalar
5. **Aguarde** conclusão

### Passo 3: Atalho
- **Menu Iniciar:** Tasca Do Vereda
- **Desktop:** Atalho criado automaticamente
- **Executar:** `C:\Program Files\Tasca Do Vereda\tasca-do-vereda.exe`

## 🖥️ **Funcionalidades Produção**

### ✅ **Dashboard Owner**
- **Acesso:** PIN `0000`
- **URL:** `http://localhost:1420/owner/login`
- **Features:** Métricas, relatórios, gestão

### ✅ **POS Vendas**
- **Acesso:** Login com PIN
- **URL:** `http://localhost:1420/pos`
- **Features:** Vendas, impressão, gestão mesas

### ✅ **Gestão Compras**
- **Acesso:** Login com PIN
- **URL:** `http://localhost:1420/purchases`
- **Features:** Pedidos, aprovação, documentos

### ✅ **Sistema Completo**
- **API Supabase:** Conectada e funcional
- **Banco Local:** SQLite integrado
- **Impressão:** Térmica + fallback
- **Offline Mode:** Funcionalidade completa

## 🔐 **Configuração Inicial**

### 1. Primeiro Acesso
1. **Abra** aplicação
2. **Login** com PIN `0000`
3. **Configure** dados do restaurante
4. **Teste** funcionalidades

### 2. Configuração Supabase
- **URL:** `https://tboiuiwlqfzcvakxrsmj.supabase.co`
- **Chave:** Já configurada no build
- **Status:** ✅ Conectado

### 3. Impressora Térmica
- **Modelo:** Epson TM-T20 (padrão)
- **Porta:** USB automática
- **Teste:** Botão "Reimprimir Último"

## 🚨 **Solução de Problemas**

### Erro 401 Invalid API Key
- ✅ **Resolvido:** Chave embutida no build
- ✅ **Ação:** Use a versão MSI (já tem chaves)

### Impressão Não Funciona
1. **Verifique** conexão USB
2. **Teste** com "Reimprimir Último"
3. **Fallback:** window.print() automático

### Banco Não Sincroniza
1. **Verifique** conexão internet
2. **Teste** API Supabase
3. **Reinicie** aplicação

## 📱 **Acesso Web vs Desktop**

### Desktop (MSI)
- **Porta:** 1420
- **Performance:** Máxima
- **Offline:** 100% funcional
- **Integração:** Hardware completo

### Web (Vercel)
- **URL:** https://rest-ia.vercel.app
- **Performance:** Excelente
- **Sync:** Tempo real
- **Acesso:** Qualquer dispositivo

## 🎯 **Deploy Produção**

### MSI - Instalação Corporativa
```bash
# Distribuir MSI para estações
scp "Tasca Do Vereda_1.0.5_x64_pt-PT.msi" admin@empresa:/instaladores/
```

### Executável - Testes Rápidos
```bash
# Executar direto sem instalação
./tasca-do-vereda.exe
```

## 📞 **Suporte Técnico**

### Contato
- **Email:** support@vereda.ao
- **Telefone:** +244 923 000 000
- **Horário:** Seg-Sex 8h-18h

### Documentação
- **Manual:** [Link Manual Completo]
- **API:** [Documentação Supabase]
- **Updates:** Automáticos via MSI

---

**🚀 Tasca Do Vereda v1.0.5 - Produção Ready!**
**✅ Build: 8094372 | ✅ Status: Production Stable**
