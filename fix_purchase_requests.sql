-- Corrigir status das purchase_requests para valores válidos
INSERT INTO public.purchase_requests (id, created_at, description, amount, provider, status, approved_at) VALUES
('550e8400-e29b-41d4-a716-446655440030', CURRENT_TIMESTAMP, 'Matéria-prima para cozinha', 85000.00, 'Fornecedor A', 'aprovado', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440031', CURRENT_TIMESTAMP, 'Bebidas e refrigerantes', 65000.00, 'Fornecedor B', 'aprovado', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440032', CURRENT_TIMESTAMP, 'Material de limpeza', 25000.00, 'Fornecedor C', 'aprovado', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440033', CURRENT_TIMESTAMP, 'Embalagens e descartáveis', 35000.00, 'Fornecedor D', 'aprovado', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440034', CURRENT_TIMESTAMP, 'Produtos de higiene', 15000.00, 'Fornecedor E', 'aprovado', CURRENT_TIMESTAMP);

-- Verificar totais novamente
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
SELECT 'Mesas Ativas:', COUNT(*)::text
FROM public.orders 
WHERE status = 'open';
