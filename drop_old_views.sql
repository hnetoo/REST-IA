-- 🔑 DROP OLD VIEWS - Limpeza de views antigas
-- Remove todas as views antigas para forçar uso da final_business_summary

-- DROP VIEW se existir
DROP VIEW IF EXISTS dashboard_metrics_view;
DROP VIEW IF EXISTS dashboard_stats_v2;
DROP VIEW IF EXISTS dashboard_summary;
DROP VIEW IF EXISTS business_overview;
DROP VIEW IF EXISTS financial_dashboard;
DROP VIEW IF EXISTS sales_summary;
DROP VIEW IF EXISTS expense_summary;
DROP VIEW IF EXISTS staff_dashboard;

-- 🔑 LOG DE LIMPEZA
-- Executar este script no Supabase SQL Editor
-- Depois executar, confirmar que só existe a view final_business_summary

-- ✅ VERIFICAÇÃO:
SELECT * FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'final_business_summary';

-- 🔑 RESULTADO ESPERADO:
-- Apenas uma view: final_business_summary
-- Todas as outras views devem ser removidas

-- 📋 NOTAS:
-- 1. Este script deve ser executado ANTES de atualizar a App
-- 2. Após executar, a App só deve usar final_business_summary
-- 3. Qualquer referência a views antigas deve ser removida
-- 4. Dashboard deve ser atualizado para ler apenas da nova view

-- 🎯 OBJETIVO:
-- Evitar conflitos entre views antigas e nova
-- Forçar uso único da final_business_summary
-- Simplificar manutenção do código
