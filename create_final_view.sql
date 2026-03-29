-- 🔑 FINAL BUSINESS SUMMARY VIEW - Versão Corrigida
-- Sem índices (views não suportam índices no PostgreSQL)

-- 🔑 DROP OLD VIEWS
DROP VIEW IF EXISTS dashboard_metrics_view;
DROP VIEW IF EXISTS dashboard_stats_v2;
DROP VIEW IF EXISTS dashboard_summary;
DROP VIEW IF EXISTS business_overview;
DROP VIEW IF EXISTS financial_dashboard;
DROP VIEW IF EXISTS sales_summary;
DROP VIEW IF EXISTS expense_summary;
DROP VIEW IF EXISTS staff_dashboard;

-- 🔑 CREATE NEW VIEW
CREATE OR REPLACE VIEW final_business_summary AS
WITH 
-- 1. Histórico Externo (8M fixo)
external_history AS (
    SELECT 
        COALESCE(SUM(total_revenue), 0) as total_historico,
        'Histórico Externo' as fonte
    FROM external_history
),

-- 2. Vendas Totais (com JOIN para obter custos dos produtos)
orders_summary AS (
    SELECT 
        COALESCE(SUM(o.total_amount), 0) as total_vendas,
        COALESCE(SUM(
            (oi.quantity * (p.price - COALESCE(p.cost_price, 0)))
        ), 0) as total_custos_produtos,
        'Vendas' as fonte
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'closed'
),

-- 3. Despesas Totais
expenses_summary AS (
    SELECT 
        COALESCE(SUM(amount_kz), 0) as total_despesas,
        'Despesas' as fonte
    FROM expenses
    WHERE status = 'pago'
),

-- 4. Salários Totais
staff_summary AS (
    SELECT 
        COALESCE(SUM(base_salary_kz), 0) as total_salarios,
        'Salários' as fonte
    FROM staff
    WHERE status = 'active'
)

-- 5. Combinação Final
SELECT 
    -- Valores Base
    eh.total_historico,
    os.total_vendas,
    os.total_custos_produtos,
    es.total_despesas,
    ss.total_salarios,
    
    -- Cálculos Financeiros
    (eh.total_historico + os.total_vendas) as faturacao_total,
    (os.total_custos_produtos + es.total_despesas + ss.total_salarios) as custos_totais,
    (eh.total_historico + os.total_vendas - os.total_custos_produtos - es.total_despesas - ss.total_salarios) as lucro_liquido,
    
    -- Métricas Adicionais
    CASE 
        WHEN (eh.total_historico + os.total_vendas) > 0 
        THEN ROUND(((eh.total_historico + os.total_vendas - os.total_custos_produtos - es.total_despesas - ss.total_salarios) / (eh.total_historico + os.total_vendas)) * 100, 2)
        ELSE 0 
    END as margem_lucro_percentagem,
    
    -- Metadados
    CURRENT_TIMESTAMP as data_ultima_atualizacao,
    'GMT+1 (Angola)' as fuso_horario

FROM external_history eh
CROSS JOIN orders_summary os
CROSS JOIN expenses_summary es
CROSS JOIN staff_summary ss;

-- 🔑 VERIFICAÇÃO
SELECT 'View final_business_summary criada com sucesso!' as status;
