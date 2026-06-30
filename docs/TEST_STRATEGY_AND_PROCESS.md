# Estratégia de Testes e Processo de Validação Incremental

## 1. Visão Geral e Filosofia
**"Evolução sobre Revolução"**

O objetivo principal é maximizar o valor da base de código existente (`rest-ia-os-v1.0.5`), garantindo que a migração para o Supabase e as correções recentes (MSI) sejam integradas sem reescrever funcionalidades estáveis. Assumimos que a lógica de negócio atual (cálculos financeiros, fluxo de pedidos, geração de SAF-T) está correta e deve ser preservada.

Qualquer alteração deve ser justificada por:
1.  Incompatibilidade técnica com a nova arquitetura de dados (Supabase).
2.  Bug crítico identificado durante os testes.
3.  Requisito explícito de segurança ou performance não atendido.

## 2. Avaliação do Estado Atual

### Pontos Fortes (A Manter)
-   **Frontend & UX**: Interface React bem estruturada (ex: `Finance.tsx`, `Settings.tsx`) e responsiva.
-   **Lógica de Negócio**: Cálculos de impostos, totais e lucros já implementados no frontend/store.
-   **Serviços Auxiliares**: Geração de SAF-T, impressão térmica e lógica de backup local.

### Áreas de Risco (Foco dos Testes)
-   **Persistência de Dados**: A troca do `localStorage`/`lowdb` para Supabase é a mudança mais crítica.
-   **Sincronização**: Garantir que o `useStore` (Zustand) reflita o estado do servidor em tempo real ou próximo disso.
-   **Autenticação**: A migração de usuários locais para Supabase Auth pode quebrar sessões ou permissões.

## 3. Plano de Testes Abrangente

### Fase 1: Validação de Dados (Pós-Migração)
*Objetivo: Garantir que o banco de dados Supabase reflete exatamente o estado local anterior.*
-   [ ] **Contagem de Registros**: Comparar total de categorias, pratos, pedidos e clientes (Script `supabase_verification_rollback.sql`).
-   [ ] **Integridade Referencial**: Verificar se todos os pratos têm categorias válidas e pedidos têm itens válidos.
-   [ ] **Tipos de Dados**: Confirmar se valores monetários e datas foram migrados corretamente (ex: Timezones).

### Fase 2: Testes de Integração (Camada de Dados)
*Objetivo: Validar a comunicação entre a Aplicação e o Supabase.*
-   [ ] **Conexão**: Verificar se o cliente Supabase conecta corretamente em ambientes de Dev e Staging.
-   [ ] **Leitura**: O `useStore` carrega a lista inicial de produtos/pedidos corretamente?
-   [ ] **Escrita**: Criar um novo pedido no POS e verificar se aparece no painel do Supabase.
-   [ ] **Updates**: Alterar uma configuração (ex: Nome do Restaurante) e recarregar a página para confirmar persistência.

### Fase 3: Testes Funcionais (Por Módulo)
*Objetivo: Validar as funcionalidades de usuário final.*

#### A. Finanças (`Finance.tsx`)
-   [ ] **Métricas**: Verificar se "Total Bruto" e "Lucro" batem com os dados do banco.
-   [ ] **Relatórios**: Gerar relatório financeiro e comparar com os dados na tela.
-   [ ] **SAF-T**: Gerar arquivo XML e validar estrutura básica.

#### B. Configurações (`Settings.tsx`)
-   [ ] **Persistência**: Salvar configurações, fechar app/navegador, reabrir e verificar se mantêm.
-   [ ] **Logos**: Verificar se caminhos de imagem (agora absolutos ou URLs) carregam corretamente.

#### C. POS & Pedidos
-   [ ] **Fluxo Completo**: Abrir pedido -> Adicionar itens -> Fechar pedido (Pagamento).
-   [ ] **Estoque**: Verificar se (caso implementado) o estoque é decrementado.

### Fase 4: Segurança e Autenticação
-   [ ] **Login**: Testar login com usuário migrado.
-   [ ] **RLS (Row Level Security)**: Tentar acessar dados de outro tenant/usuário (se aplicável) ou como anônimo indevidamente.

## 4. Processo de Ajuste Incremental

Caso um teste falhe, seguiremos este protocolo estrito para evitar refatorações desnecessárias:

1.  **Identificação e Isolamento**:
    *   Reproduzir o erro.
    *   Identificar se é erro de *Dados* (migração incorreta) ou *Código* (lógica incompatível).

2.  **Análise de Causa Raiz**:
    *   Usar ferramentas de busca (`grep`, `search_codebase`) para encontrar onde a falha ocorre.
    *   Exemplo: Se o relatório financeiro está zerado, verificar se `activeOrders` está populado no `useStore`.

3.  **Prototipação da Correção (Menor Intervenção Possível)**:
    *   **Opção A (Preferida)**: Ajuste pontual. (Ex: Converter string de data para objeto Date antes do cálculo).
    *   **Opção B**: Adapter/Wrapper. Criar uma função utilitária que adapta o novo formato de dados para o componente antigo.
    *   **Opção C (Último Recurso)**: Reescrever o componente. Só aceitável se a lógica antiga for fundamentalmente incompatível com o modelo assíncrono do Supabase.

4.  **Validação Rigorosa**:
    *   Testar a correção.
    *   Executar testes de regressão (verificar se não quebrou algo ao redor).

## 5. Critérios de Decisão: Ajuste vs. Reimplementação

| Cenário | Ação Recomendada |
| :--- | :--- |
| Erro de tipagem (ex: `string` vs `number`) | **Ajuste**: Casting ou conversão no ponto de entrada. |
| Componente lento devido a muitos dados | **Ajuste**: Implementar paginação ou `virtualization` no componente existente. |
| Lógica de negócio (ex: cálculo de imposto) errada | **Ajuste**: Corrigir a fórmula na função existente. |
| Tecnologia obsoleta impedindo build (ex: lib abandonada) | **Substituição**: Trocar apenas a lib específica, mantendo a interface. |
| Código "Espaguete" difícil de entender, mas funcionando | **Manter**: Se funciona e passa nos testes, não refatore agora. Documente como dívida técnica. |

---
**Status**: Documento criado em 10/02/2026.
**Próxima Ação**: Iniciar execução da Fase 1 do Plano de Testes (Validação de Dados de Migração).
