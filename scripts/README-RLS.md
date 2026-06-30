# Desativar RLS em Todas as Tabelas

## Opção 1: Painel do Supabase (Mais Simples)

1. Vá ao painel do Supabase: https://supabase.com/dashboard/project/tboiuiwlqfzcvakxrsmj
2. Clique em **SQL Editor** (no menu lateral)
3. Cole o conteúdo de `scripts/disable-rls.sql`
4. Clique em **Run**

## Opção 2: Supabase CLI

```bash
# Login no Supabase CLI (se ainda não estiver logado)
supabase login

# Link ao projeto
supabase link --project-ref tboiuiwlqfzcvakxrsmj

# Executar o SQL
supabase db execute --file scripts/disable-rls.sql
```

## Opção 3: Node.js Script (requer Service Role Key)

1. Vá ao painel do Supabase > Project Settings > API
2. Copie a **service_role key** (⚠️ NUNCA partilhe esta chave!)
3. Execute no PowerShell:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "sua-service-role-key-aqui"
node scripts/disable-rls-node.js
```

## Verificar Resultado

Para confirmar que o RLS foi desativado, execute no SQL Editor:

```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace 
AND relkind = 'r';
```

Se `relrowsecurity` for `false` em todas as tabelas, o RLS está desativado.
