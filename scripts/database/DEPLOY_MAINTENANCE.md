# GUIA DE IMPLANTACAO - MANUTENCAO DO BANCO

## Arquivos Criados

| Arquivo | Descricao |
|---------|-----------|
| `setup-database-maintenance.sql` | SQL para criar funcoes e tabela de arquivo no Supabase |
| `../../supabase/functions/database-maintenance/index.ts` | Edge Function para executar manutencao via HTTP |

---

## PASSO 1: Executar SQL no Supabase (Fase 1 e 2)

1. Acesse o **Supabase Dashboard** do projeto
2. Va em **SQL Editor** > **New query**
3. Copie e cole o conteudo de `setup-database-maintenance.sql`
4. Clique em **Run**
5. Verifique se as funcoes foram criadas:

```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('cleanup_old_active_orders', 'archive_old_audit_logs', 'get_database_size_stats');
```

**Resultado esperado:**
```
proname
cleanup_old_active_orders
archive_old_audit_logs
get_database_size_stats
```

---

## PASSO 2: Testar Manualmente (Antes de automatizar)

### Testar Fase 1 - Limpeza de Active Orders
```sql
-- Preview: quantos registros seriam deletados?
SELECT COUNT(*) as would_delete FROM active_orders 
WHERE updated_at < NOW() - INTERVAL '24 hours' AND status != 'ABERTO';

-- Executar limpeza
SELECT cleanup_old_active_orders();
```

### Testar Fase 2 - Arquivamento de Audit Logs
```sql
-- Preview: quantos logs seriam arquivados?
SELECT COUNT(*) as would_archive FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Executar arquivamento
SELECT archive_old_audit_logs();

-- Verificar que os logs foram movidos
SELECT COUNT(*) as archived_count FROM audit_logs_archive;
```

### Verificar Estatisticas
```sql
SELECT * FROM get_database_size_stats();
```

---

## PASSO 3: Deploy da Edge Function (Opcional - para automacao HTTP)

### Requisitos
- Supabase CLI instalado: `npm install -g supabase`
- Login no Supabase: `supabase login`

### Deploy
```bash
# No diretorio do projeto
supabase functions deploy database-maintenance
```

### Configurar CRON (forma recomendada sem Edge Function)
Como o plano Free nao tem pg_cron, use um servico externo:

#### Opcao A: cron-job.org (Gratuito)
1. Crie conta em https://cron-job.org
2. Configure um job com URL:
   ```
   https://<seu-projeto>.supabase.co/functions/v1/database-maintenance
   ```
3. Metodo: POST
4. Body: `{"tasks":["all"]}`
5. Schedule: Mensal (dia 1, 03:00 da manha)

#### Opcao B: GitHub Actions (Gratuito)
Crie `.github/workflows/database-maintenance.yml`:

```yaml
name: Database Maintenance
on:
  schedule:
    - cron: '0 3 1 * *'  # Dia 1 de cada mes, 03:00 UTC
  workflow_dispatch:     # Permite executar manualmente

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - name: Run cleanup
        run: |
          curl -X POST \
            https://<seu-projeto>.supabase.co/functions/v1/database-maintenance \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"tasks":["all"]}'
```

#### Opcao C: Executar via SQL direto (Mais simples)
Execute o SQL de manutencao manualmente via Dashboard uma vez por mes:

```sql
-- Executar no primeiro dia de cada mes
SELECT cleanup_old_active_orders();
SELECT archive_old_audit_logs();
SELECT * FROM get_database_size_stats();
```

---

## PASSO 4: Monitoramento

### Query para monitorar crescimento
```sql
SELECT 
    table_name,
    row_count,
    size_pretty
FROM get_database_size_stats()
WHERE table_name IN ('orders', 'order_items', 'audit_logs', 'audit_logs_archive', 'cash_flow', 'expenses', 'active_orders');
```

### Alertas recomendados
- Executar `get_database_size_stats()` mensalmente
- Se `audit_logs` > 50.000 registros → executar arquivamento
- Se banco total > 300 MB (plano Free) → alerta amarelo
- Se banco total > 400 MB (plano Free) → alerta vermelho

---

## SEGURANCA

- A funcao `archive_old_audit_logs` usa `SECURITY DEFINER` (executa como dono)
- A edge function usa `SUPABASE_SERVICE_ROLE_KEY` (acesso total)
- Nunca exponha a SERVICE_ROLE_KEY no frontend
- A edge function so aceita POST/GET e retorna JSON

---

## ROLLBACK (se necessario)

Se algo der errado, voce pode restaurar os logs do arquivo:

```sql
-- Mover todos os logs de volta (use com cautela)
INSERT INTO audit_logs SELECT * FROM audit_logs_archive;
```

---

## CHECKLIST

- [ ] SQL executado no Supabase Dashboard
- [ ] Funcoes verificadas (`cleanup_old_active_orders`, `archive_old_audit_logs`)
- [ ] Teste manual realizado
- [ ] Tabela `audit_logs_archive` confirmada
- [ ] Cron configurado (mensal)
- [ ] Edge function deployada (opcional)
- [ ] Primeira execucao de arquivamento realizada
