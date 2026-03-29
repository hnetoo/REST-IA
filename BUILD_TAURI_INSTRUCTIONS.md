# BUILD TAURI - Tasca do Vereda POS v1.0.6

## PRÉ-REQUISITOS

1. **Instalar Rust**: https://rustup.rs/
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Instalar Node.js Dependencies**:
   ```bash
   npm install
   ```

3. **Instalar Tauri CLI**:
   ```bash
   npm install -g @tauri-apps/cli
   ```

## COMANDOS DE BUILD

### Build para Desenvolvimento
```bash
npm run desktop
```

### Build para Produção (MSI)
```bash
npm run build:msi
```

### Build para Todas as Plataformas
```bash
npm run build:app
```

## LOCALIZAÇÃO DO ARQUIVO MSI

Após o build, o instalador `.msi` será gerado em:
```
src-tauri/target/release/bundle/msi/Tasca_do_Vereda_POS_1.0.6_x64_en-US.msi
```

## ESTRUTURA DO PROJETO TAURI

### Configuração
- `src-tauri/tauri.conf.json` - Configuração principal
- `src-tauri/Cargo.toml` - Dependências Rust
- `src-tauri/src/main.rs` - Backend Rust
- `src-tauri/src/auto_schema.sql` - Schema automático do banco

### Componentes React
- `src/App_tauri.tsx` - App principal com verificação de configuração
- `src/components/SetupModal.tsx` - Modal de configuração inicial
- `src/views/` - Mesmas views da aplicação web

## FUNCIONALIDADES IMPLEMENTADAS

### 1. Configuração Inicial Automática
- Verifica se existe configuração ao iniciar
- Exibe modal de setup se necessário
- Testa conexão com Supabase antes de salvar
- Salva em localStorage e arquivo local

### 2. Auto-Schema do Banco de Dados
- Cria automaticamente todas as tabelas necessárias
- Insere dados padrão (categorias, produtos, mesas)
- Mantém estrutura consistente com aplicação web

### 3. Build Otimizado para Windows
- Gera instalador `.msi` com ícones
- Configuração para Windows (pt-PT)
- Notificações nativas habilitadas

## CONFIGURAÇÃO DE SUPABASE

O modal de configuração pedirá:
- **SUPABASE_URL**: URL do projeto Supabase
- **SUPABASE_ANON_KEY**: Chave anônima do projeto

A configuração será salva em:
- `localStorage` (para compatibilidade web)
- Arquivo local (para persistência Tauri)

## TESTE DE CONEXÃO

Antes de salvar, o sistema testa a conexão:
- Query simples na tabela `products`
- Feedback visual de sucesso/erro
- Só permite salvar após teste bem-sucedido

## SINCRONIZAÇÃO DE DASHBOARDS

As queries SQL garantem que:
- Dashboard App e Owner Hub usem mesmos filtros
- Status unificados: `['FECHADO', 'closed', 'paid']`
- Timezone sincronizado: GMT+1 Angola
- Mesmas estruturas de tabelas

## DEPLOYMENT

### Para Distribuição
1. Build o projeto:
   ```bash
   npm run build:msi
   ```

2. Encontre o MSI em:
   ```
   src-tauri/target/release/bundle/msi/
   ```

3. Distribua o arquivo `.msi` gerado

### Para Desenvolvimento
```bash
npm run desktop
```

## VERSÃO E IDENTIDADE

- **Versão**: 1.0.6
- **Nome**: Tasca do Vereda POS
- **Publisher**: Vereda Systems Angola
- **Idioma**: pt-PT
- **Plataforma**: Windows (.msi)

## SUPORTE

Em caso de erros durante o build:
1. Verifique se Rust está instalado corretamente
2. Limpe o cache: `npm run clean` ou `cargo clean`
3. Reinstale dependências: `npm install`
4. Verifique se todas as variáveis de ambiente estão configuradas
