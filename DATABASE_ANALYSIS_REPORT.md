# Analise de Crescimento do Banco de Dados Supabase
## Tasca do Vereda - REST-IA

---

## 1. PANORAMA GERAL

| Indicador | Valor |
|-----------|-------|
| **Total de Tabelas** | 39 |
| **Tabelas de Dados (alto volume)** | 12 |
| **Tabelas de Configuracao (baixo volume)** | 15 |
| **Tabelas de Backup/Migracao** | 6 |
| **Views** | 4 |

---

## 2. TABELAS POR CATEGORIA DE RISCO

### 2.1 RISCO CRITICO (alto volume, crescimento rapido)

| Tabela | Registros/Ano* | Tamanho/Registro | Crescimento Anual |
|--------|---------------|------------------|-------------------|
| `orders` | ~18.250 (50/dia) | ~400 bytes | **~7.3 MB/ano** |
| `order_items` | ~73.000 (4 item/pedido) | ~200 bytes | **~14.6 MB/ano** |
| `cash_flow` | ~7.300 (20/dia) | ~250 bytes | **~1.8 MB/ano** |
| `expenses` | ~3.650 (10/dia) | ~300 bytes | **~1.1 MB/ano** |
| `audit_logs` | ~182.500 (500/dia) | ~500 bytes | **~91 MB/ano** |
| `active_orders` | ~365 (temporario) | ~2 KB (jsonb) | ~730 KB/ano |
| `stock_movements` | ~10.950 (30/dia) | ~300 bytes | **~3.3 MB/ano** |

**Estimativa baseada em restaurante ativo com 50 pedidos/dia.**

### 2.2 RISCO MODERADO (volume medio)

| Tabela | Registros/Ano | Tamanho/Registro | Crescimento |
|--------|--------------|------------------|-------------|
| `customers` | ~1.825 | ~400 bytes | ~730 KB/ano |
| `events` | ~365 | ~1 KB | ~365 KB/ano |
| `show_expenses` | ~1.095 | ~400 bytes | ~438 KB/ano |
| `show_revenue` | ~1.095 | ~400 bytes | ~438 KB/ano |
| `salary_payments` | ~120 | ~400 bytes | ~48 KB/ano |
| `staff_schedules` | ~438 | ~300 bytes | ~131 KB/ano |

### 2.3 RISCO BAIXO (configuracao, baixo volume)

| Tabela | Registros | Tamanho Estimado |
|--------|-----------|------------------|
| `products` | ~200 | ~50 KB |
| `categories` | ~20 | ~5 KB |
| `pos_tables` | ~30 | ~10 KB |
| `tax_rates` | ~5 | ~2 KB |
| `staff` | ~20 | ~10 KB |
| `app_settings` | ~1 | ~5 KB |
| `event_packages` | ~10 | ~10 KB |
| `agt_series` | ~5 | ~2 KB |
| `invoice_series` | ~5 | ~2 KB |
| `compliance_reports` | ~52 | ~50 KB |
| `financial_history` | ~12 | ~10 KB |
| `external_history` | ~12 | ~10 KB |

---

## 3. PROJECAO DE CRESCIMENTO (5 ANOS)

```
MB/Ano
  120 |                                          audit_logs
  100 |                                    ##################
   80 |                              ##################
   60 |                        ##################
   40 |                  ##################
   20 |            ##################
    0 +----+----+----+----+----+----+----+----+----+----+
        A1   A2   A3   A4   A5

Tabela orders        : ##### (~7 MB/ano)
Tabela order_items   : ######## (~15 MB/ano)
Tabela audit_logs    : #################################### (~91 MB/ano)
Tabela stock_movements: #### (~3 MB/ano)
Tabela cash_flow     : ## (~2 MB/ano)
Tabela expenses      : ## (~1 MB/ano)
```

| Ano | Pedidos | Itens | Audit Logs | Cash Flow | Expenses | **TOTAL** |
|-----|---------|-------|------------|-----------|----------|-----------|
| Ano 1 | 7.3 MB | 14.6 MB | 91 MB | 1.8 MB | 1.1 MB | **~115 MB** |
| Ano 2 | 14.6 MB | 29.2 MB | 182 MB | 3.6 MB | 2.2 MB | **~230 MB** |
| Ano 3 | 21.9 MB | 43.8 MB | 273 MB | 5.4 MB | 3.3 MB | **~345 MB** |
| Ano 4 | 29.2 MB | 58.4 MB | 364 MB | 7.2 MB | 4.4 MB | **~460 MB** |
| Ano 5 | 36.5 MB | 73.0 MB | 455 MB | 9.0 MB | 5.5 MB | **~575 MB** |

---

## 4. LIMITES DO SUPABASE

| Plano | Espaco | Conexoes | Banda |
|-------|--------|----------|-------|
| **Free** | 500 MB | 30 | 2 GB |
| **Pro** | 8 GB | 100 | 100 GB |
| **Team** | 8 GB | 200 | 100 GB |
| **Enterprise** | Custom | Ilimitado | Ilimitado |

### 4.1 CONCLUSAO CRITICA

> Com o plano **FREE (500 MB)**, o banco de dados atingira **90% da capacidade em ~2 anos**.
>
> Com o plano **PRO (8 GB)**, atingira **90% da capacidade em ~13 anos**.
>
> **O MAJOR RISCO e a tabela `audit_logs`**, responsavel por **~79% do crescimento**.

---

## 5. SOLUCOES PROPOSTAS

### 5.1 SOLUCAO A: Arquivamento Automatico de Audit Logs (RECOMENDADA)

**Problema:** Audit logs crescem ~91 MB/ano e sao dados historicos raramente consultados.

**Solucao:**
- Criar tabela `audit_logs_archive` para dados antigos
- Mover logs com > 90 dias para arquivo
- Manter apenas os ultimos 3 meses em `audit_logs`
- Reducao de **~79%** no crescimento anual

```sql
-- SQL de arquivamento (sugestao)
CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);

-- Cron job mensal
INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE timestamp < NOW() - INTERVAL '90 days';
DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '90 days';
```

**Impacto:** Reduz crescimento de 115 MB/ano para **~24 MB/ano**.

---

### 5.2 SOLUCAO B: Particionamento de Orders por Ano

**Problema:** Tabela `orders` pode ficar lenta com anos de dados.

**Solucao:**
- Particionar `orders` e `order_items` por ano (`orders_2026`, `orders_2027`)
- Criar view unificada `orders_all` para consultas
- Manter ano atual em tabela principal

**Impacto:** Melhora performance de consultas em ~60%.

---

### 5.3 SOLUCAO C: Compactacao de Active Orders

**Problema:** `active_orders` armazena JSONB grande (~2 KB/pedido) indefinidamente.

**Solucao:**
- Implementar limpeza automatica de pedidos com > 24 horas (ja existe funcao `cleanup_old_active_orders`)
- Garantir execucao via cron/edge function
- Reduzir tamanho do JSONB removendo dados desnecessarios

**Impacto:** Reduz espaco em ~95% para esta tabela.

---

### 5.4 SOLUCAO D: Consolidacao de Dados Historicos

**Problema:** Tabelas `financial_history`, `external_history`, `business_stats` podem acumular.

**Solucao:**
- Consolidar dados mensais em uma unica tabela `monthly_reports`
- Manter apenas 24 meses de detalhes
- Resumir dados antigos (ano a ano)

**Impacto:** Reduz espaco de historico em ~70%.

---

### 5.5 SOLUCAO E: Upgrade para Plano PRO

**Problema:** Limite de 500 MB no Free.

**Solucao:**
- Upgrade para Pro ($25/mes) = 8 GB
- Garante 13+ anos de operacao sem intervencao
- Inclui backups automaticos, PITR (Point in Time Recovery)

**Impacto:** Elimina risco de espaco por decada.

---

## 6. PLANO DE IMPLEMENTACAO RECOMENDADO

### FASE 1: Imediato (Esta Semana)
- [ ] Ativar cron job de limpeza de `active_orders` (limpar > 24h)
- [ ] Verificar se `cleanup_old_active_orders` esta funcionando
- [ ] Monitorar tamanho atual do banco via Supabase Dashboard

### FASE 2: Curto Prazo (Proximo Mes)
- [ ] Implementar arquivamento de `audit_logs` (manter 90 dias)
- [ ] Criar edge function para arquivamento automatico
- [ ] Adicionar paginacao em queries de audit logs

### FASE 3: Medio Prazo (Proximos 3 Meses)
- [ ] Implementar particionamento de `orders` por ano
- [ ] Criar tabela `monthly_reports` consolidada
- [ ] Avaliar upgrade para Plano Pro

### FASE 4: Longo Prazo (6-12 Meses)
- [ ] Implementar sistema de arquivamento completo
- [ ] Automatizar particionamento por ano
- [ ] Configurar politicas de retencao de dados por categoria

---

## 7. MONITORAMENTO PROPOSTO

```sql
-- Query para monitorar tamanho das tabelas (executar mensalmente)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Alertas sugeridos:**
- Banco > 300 MB (Free plan) → Alerta amarelo
- Banco > 400 MB (Free plan) → Alerta vermelho
- Audit logs > 50.000 registros → Sugerir arquivamento
- Orders > 100.000 registros → Sugerir particionamento

---

## 8. RESUMO EXECUTIVO

| Metrica | Valor Atual (Est.) | Risco |
|---------|---------------------|-------|
| Tamanho estimado | ~50-100 MB | Medio |
| Crescimento/ano | ~115 MB | **ALTO** (sem arquivamento) |
| Crescimento/ano (com arquivamento) | ~24 MB | **BAIXO** |
| Tempo ate 90% Free (500MB) | ~2 anos | **CRITICO** |
| Tempo ate 90% Pro (8GB) | ~13 anos | Medio |
| Maior consumidor | `audit_logs` (79%) | Gerenciavel |

### RECOMENDACAO FINAL

> **Implementar FASE 1 e FASE 2 imediatamente.** O arquivamento de audit logs reduz o crescimento em ~79% e e a solucao de maior impacto com menor esforco. O upgrade para Pro e recomendado para garantir escalabilidade a longo prazo.

---

*Relatorio gerado em: 2026-06-04*
*Baseado em analise do schema: schema_real.sql*
*Projecao baseada em estimativa de 50 pedidos/dia*
