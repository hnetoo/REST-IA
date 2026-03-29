# Plano de Migração de Autenticação Local para Supabase Auth

Este documento detalha a estratégia para migrar utilizadores de um sistema de autenticação local existente para o Supabase Auth, garantindo a preservação de roles e permissões, e a integração com Row Level Security (RLS).

## 1. Mapeamento de Utilizadores Existentes

### Objetivo
Associar os utilizadores existentes no sistema local a novas contas no Supabase Auth, mantendo uma referência ao ID de utilizador original.

### Estratégia
-   **Tabela `user_profiles`**: A tabela `public.user_profiles` no Supabase será usada para armazenar informações adicionais do perfil do utilizador e uma referência ao `legacy_user_id` (ID do utilizador no sistema local).
    ```sql
    CREATE TABLE IF NOT EXISTS public.user_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        legacy_user_id TEXT UNIQUE, -- ID do utilizador no sistema de autenticação local
        full_name TEXT,
        role TEXT NOT NULL, -- Ex: 'admin', 'manager', 'employee'
        permissions TEXT[] DEFAULT '{}', -- Permissões específicas (ex: ['can_edit_menu', 'can_view_reports'])
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
-   **Processo de Migração**:
    1.  Para cada utilizador no sistema local, será criada uma nova conta no Supabase Auth (via `auth.users`).
    2.  O `id` gerado pelo Supabase Auth será usado como `id` na tabela `public.user_profiles`.
    3.  O ID original do utilizador local será armazenado na coluna `legacy_user_id` para referência.
    4.  Outros dados do perfil (nome completo, role, permissões) serão migrados para `public.user_profiles`.

## 2. Tratamento de Palavras-Passe

### Objetivo
Garantir a segurança das contas de utilizador, uma vez que as palavras-passe locais não podem ser migradas diretamente devido a diferentes métodos de hashing.

### Estratégia
-   **Redefinição de Palavras-Passe**: As palavras-passe dos utilizadores **não serão migradas**. Após a migração, os utilizadores serão notificados de que as suas contas foram transferidas e que precisam de redefinir as suas palavras-passe para aceder ao novo sistema.
-   **Fluxo de Redefinição**: O Supabase Auth oferece um fluxo de redefinição de palavras-passe robusto e seguro. A aplicação cliente deve ser atualizada para utilizar este fluxo.

## 3. Preservação de Roles e Permissões

### Objetivo
Manter a estrutura de roles e permissões existente, integrando-a com o sistema de RLS do Supabase.

### Estratégia
-   **Roles Customizadas**: As roles (ex: 'admin', 'manager', 'employee') serão armazenadas na coluna `role` da tabela `public.user_profiles`.
-   **Permissões Detalhadas**: Permissões mais granulares (ex: 'can_edit_menu') serão armazenadas como um array de texto na coluna `permissions` da tabela `public.user_profiles`.
-   **Integração com RLS**: As políticas de RLS serão escritas para fazer referência a estas colunas (`role` e `permissions`) na tabela `public.user_profiles`, garantindo que apenas utilizadores com as roles e permissões corretas possam aceder ou modificar dados específicos.

## 4. Políticas de Row Level Security (RLS)

### Objetivo
Replicar a lógica de permissões existente usando as políticas de RLS do Supabase.

### Estratégia
-   **Ficheiro `supabase_auth.sql`**: Este ficheiro conterá todas as políticas de RLS para as tabelas relevantes.
-   **Exemplos de Políticas RLS**:
    -   **Acesso de Leitura Pública**: Para tabelas como `categories` e `dishes` que devem ser visíveis publicamente (para o menu digital), a política será `FOR SELECT USING (true)`.
    -   **Acesso Baseado em Role**: Para tabelas que exigem acesso restrito, as políticas verificarão a `role` do utilizador na tabela `public.user_profiles`.
        ```sql
        -- Exemplo: Apenas 'admin' pode inserir em 'dishes'
        CREATE POLICY "Allow admin to insert dishes" ON public.dishes
        FOR INSERT WITH CHECK (
            (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
        );

        -- Exemplo: 'manager' e 'admin' podem atualizar 'orders'
        CREATE POLICY "Allow manager and admin to update orders" ON public.orders
        FOR UPDATE USING (
            (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
        );
        ```
    -   **Acesso Baseado em Permissões**: Para permissões mais granulares, as políticas podem verificar o array `permissions`.
        ```sql
        -- Exemplo: Utilizadores com 'can_view_reports' podem selecionar em 'reports'
        CREATE POLICY "Allow users with can_view_reports to view reports" ON public.reports
        FOR SELECT USING (
            auth.uid() IS NOT NULL AND 'can_view_reports' = ANY (SELECT permissions FROM public.user_profiles WHERE id = auth.uid())
        );
        ```
-   **Ativação de RLS**: O RLS deve ser ativado para todas as tabelas que terão políticas aplicadas.

## 5. Scripts de Migração de Dados de Utilizador

### Objetivo
Migrar os dados dos perfis de utilizador do sistema local para a tabela `public.user_profiles` no Supabase.

### Estratégia
-   **Script `supabase-migrate.ts`**: O script de migração existente será estendido para:
    1.  Ler os dados dos utilizadores do sistema local (excluindo palavras-passe).
    2.  Para cada utilizador local:
        -   Chamar a API de autenticação do Supabase para criar um novo utilizador (com um email e uma palavra-passe temporária ou gerada aleatoriamente).
        -   Obter o `id` do novo utilizador Supabase Auth.
        -   Inserir os dados do perfil (incluindo `legacy_user_id`, `full_name`, `role`, `permissions`) na tabela `public.user_profiles`, usando o `id` do Supabase Auth.
-   **Considerações**:
    -   A criação de utilizadores no Supabase Auth deve ser feita com a `service_role_key` para bypassar as políticas de RLS e garantir que a criação seja bem-sucedida.
    -   É crucial que os emails dos utilizadores sejam únicos no Supabase Auth.

## 6. Comunicação de Migração aos Utilizadores

### Objetivo
Informar os utilizadores sobre a migração e as ações necessárias (redefinição de palavra-passe).

### Estratégia
-   **Templates de Email**: Criar templates de email claros e concisos para:
    -   **Notificação de Migração**: Informar os utilizadores que a sua conta foi migrada para um novo sistema.
    -   **Instruções de Redefinição de Palavra-Passe**: Fornecer um link direto para o fluxo de redefinição de palavra-passe do Supabase Auth e instruções claras sobre como proceder.
    -   **Suporte**: Incluir informações de contacto para suporte em caso de problemas.
-   **Timing**: Enviar os emails após a conclusão da migração dos dados de utilizador e antes de desativar completamente o sistema de autenticação local.

## 7. Requisitos de Implementação (Revisão)

-   **Compatibilidade**: A aplicação cliente deve ser atualizada para usar o Supabase Auth SDK para autenticação e as APIs do Supabase para acesso a dados, respeitando as novas políticas de RLS.
-   **Lógica de Negócio**: A lógica de negócio existente deve ser revista e adaptada para funcionar com as políticas de RLS e a nova estrutura de roles/permissões.
-   **Validação de Dados**: Implementar validação de dados em tempo real durante o processo de migração para identificar e tratar quaisquer inconsistências.
-   **Ambiente de Staging**: Testar extensivamente todo o processo de migração num ambiente de staging antes de aplicar em produção.
-   **Rollback**: Ter um plano de rollback claro em caso de falha crítica durante a migração.
