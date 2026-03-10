-- Inserir dados de exemplo para o Owner Dashboard

-- Limpar dados existentes
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.purchase_requests;
DELETE FROM public.staff;

-- Inserir staff (funcionários)
INSERT INTO public.staff (id, full_name, role, base_salary_kz, phone, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'João Silva', 'Garçom', 150000.00, '+244923123456', 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'Maria Santos', 'Cozinheira', 180000.00, '+244923123457', 'active'),
('550e8400-e29b-41d4-a716-446655440003', 'Pedro Costa', 'Caixa', 160000.00, '+244923123458', 'active'),
('550e8400-e29b-41d4-a716-446655440004', 'Ana Ferreira', 'Gerente', 250000.00, '+244923123459', 'active'),
('550e8400-e29b-41d4-a716-446655440005', 'Carlos Mendes', 'Garçom', 145000.00, '+244923123460', 'active');

-- Inserir pedidos de hoje
INSERT INTO public.orders (id, table_id, status, total_amount_kz, created_at, closed_at) VALUES
('550e8400-e29b-41d4-a716-446655440010', '1', 'closed', 45000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440011', '2', 'closed', 32000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440012', '3', 'closed', 28000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440013', '4', 'closed', 55000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440014', '5', 'open', 15000.00, CURRENT_TIMESTAMP, NULL);

-- Inserir pedidos de ontem (para teste de período)
INSERT INTO public.orders (id, table_id, status, total_amount_kz, created_at, closed_at) VALUES
('550e8400-e29b-41d4-a716-446655440020', '6', 'closed', 38000.00, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440021', '7', 'closed', 42000.00, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Inserir purchase_requests (despesas)
INSERT INTO public.purchase_requests (id, created_at, description, amount, provider, status, approved_at) VALUES
('550e8400-e29b-41d4-a716-446655440030', CURRENT_TIMESTAMP, 'Matéria-prima para cozinha', 85000.00, 'Fornecedor A', 'approved', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440031', CURRENT_TIMESTAMP, 'Bebidas e refrigerantes', 65000.00, 'Fornecedor B', 'approved', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440032', CURRENT_TIMESTAMP, 'Material de limpeza', 25000.00, 'Fornecedor C', 'approved', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440033', CURRENT_TIMESTAMP, 'Embalagens e descartáveis', 35000.00, 'Fornecedor D', 'approved', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440034', CURRENT_TIMESTAMP, 'Produtos de higiene', 15000.00, 'Fornecedor E', 'approved', CURRENT_TIMESTAMP);

-- Inserir order_items para completar os pedidos
INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price_kz, total_price_kz, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440100', 2, 15000.00, 30000.00, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440101', 3, 5000.00, 15000.00, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440102', 1, 32000.00, 32000.00, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440103', 4, 7000.00, 28000.00, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440104', 2, 27500.00, 55000.00, CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440105', 1, 15000.00, 15000.00, CURRENT_TIMESTAMP);

-- Verificar dados inseridos
SELECT 'Orders:' as table_name, COUNT(*) as count FROM public.orders
UNION ALL
SELECT 'Purchase Requests:', COUNT(*) FROM public.purchase_requests
UNION ALL
SELECT 'Staff:', COUNT(*) FROM public.staff
UNION ALL
SELECT 'Order Items:', COUNT(*) FROM public.order_items;

-- Verificar totais
SELECT 'Total Vendas Hoje:' as metric, COALESCE(SUM(total_amount_kz), 0) as value 
FROM public.orders 
WHERE DATE(created_at) = CURRENT_DATE AND status = 'closed'
UNION ALL
SELECT 'Total Despesas Aprovadas:', COALESCE(SUM(amount), 0)
FROM public.purchase_requests 
WHERE status = 'approved'
UNION ALL
SELECT 'Total Folha Salarial:', COALESCE(SUM(base_salary_kz), 0)
FROM public.staff 
WHERE status = 'active';
