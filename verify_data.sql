-- Verificar dados finais
SELECT 'Total Vendas Hoje:' as metric, COALESCE(SUM(total_amount_kz), 0) as value 
FROM public.orders 
WHERE DATE(created_at) = CURRENT_DATE AND status = 'closed'
UNION ALL
SELECT 'Total Despesas Aprovadas:', COALESCE(SUM(amount), 0)
FROM public.purchase_requests 
WHERE status = 'aprovado'
UNION ALL
SELECT 'Total Folha Salarial:', COALESCE(SUM(base_salary_kz), 0)
FROM public.staff 
WHERE status = 'active'
UNION ALL
SELECT 'Mesas Ativas:', COUNT(*)::numeric
FROM public.orders 
WHERE status = 'open'
UNION ALL
SELECT 'Total de Orders:', COUNT(*)::numeric
FROM public.orders
UNION ALL
SELECT 'Total de Purchase Requests:', COUNT(*)::numeric
FROM public.purchase_requests
UNION ALL
SELECT 'Total de Staff:', COUNT(*)::numeric
FROM public.staff;

-- Verificar detalhes das vendas de hoje
SELECT 'Vendas de Hoje - Detalhes:' as info, table_id, total_amount_kz, status, created_at
FROM public.orders 
WHERE DATE(created_at) = CURRENT_DATE 
ORDER BY created_at DESC;
