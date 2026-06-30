-- 🔑 MIGRAÇÃO DE EMERGÊNCIA: Corrigir data_contabil incorreto
-- Problema: Orders de 2026-04-13 estão sendo contadas como hoje (2026-04-15)
-- Solução: Corrigir data_contabil para orders com data incorreta

-- 1. Verificar orders com data_contabil = 2026-04-13
SELECT id, data_contabil, created_at, total_amount, status 
FROM orders 
WHERE data_contabil = '2026-04-13' 
  AND status IN ('closed', 'paid')
ORDER BY created_at DESC;

-- 2. Corrigir orders com data_contabil = 2026-04-13 para a data correta
-- Assumindo que estas orders foram criadas em 2026-04-15 e devem ter data_contabil = 2026-04-15
-- Apenas para orders com UUID válido (evitar erro de conversão)
UPDATE orders 
SET data_contabil = '2026-04-15',
    updated_at = NOW()
WHERE data_contabil = '2026-04-13' 
  AND status IN ('closed', 'paid')
  AND created_at >= '2026-04-15'
  AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; -- Apenas UUIDs válidos

-- 3. Verificar se há orders com data_contabil NULL e status closed/paid
SELECT id, data_contabil, created_at, total_amount, status 
FROM orders 
WHERE data_contabil IS NULL 
  AND status IN ('closed', 'paid')
ORDER BY created_at DESC;

-- 4. Corrigir orders com data_contabil NULL para usar created_at (com lógica de dia operacional)
-- Para orders de hoje (2026-04-15), usar data_contabil = 2026-04-15
UPDATE orders 
SET data_contabil = DATE(created_at AT TIME ZONE 'UTC+1'),
    updated_at = NOW()
WHERE data_contabil IS NULL 
  AND status IN ('closed', 'paid')
  AND DATE(created_at AT TIME ZONE 'UTC+1') = '2026-04-15';

-- 5. Log de correções realizadas (apenas para orders com UUID válido)
INSERT INTO data_contabil_audit_log (table_name, record_id, old_value, new_value, changed_by, change_reason, is_manual)
SELECT 
  'orders',
  id::UUID,
  '2026-04-13'::DATE,
  '2026-04-15'::DATE,
  'migration_fix',
  'Correção de emergência - orders com data_contabil incorreto',
  true
FROM orders 
WHERE data_contabil = '2026-04-15' 
  AND status IN ('closed', 'paid')
  AND updated_at >= NOW() - INTERVAL '1 minute'
  AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; -- Apenas UUIDs válidos

-- 6. Verificar resultado final
SELECT 
  data_contabil,
  COUNT(*) as count,
  SUM(total_amount) as total
FROM orders 
WHERE status IN ('closed', 'paid')
  AND data_contabil = '2026-04-15'
GROUP BY data_contabil;
