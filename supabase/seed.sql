-- Dados iniciais para o Tasca do Vereda
-- Executar após criar o schema
-- Usando as novas tabelas do schema Vereda

-- Inserir categorias do menu
INSERT INTO public.categories (id, name, icon) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Entradas', 'Soup'),
('550e8400-e29b-41d4-a716-446655440001', 'Pratos Principais', 'ChefHat'),
('550e8400-e29b-41d4-a716-446655440002', 'Sobremesas', 'IceCream'),
('550e8400-e29b-41d4-a716-446655440003', 'Bebidas', 'Coffee'),
('550e8400-e29b-41d4-a716-446655440004', 'Petiscos', 'UtensilsCrossed')
ON CONFLICT DO NOTHING;

-- Inserir produtos
INSERT INTO public.products (id, category_id, name, description, price_kz, stock_quantity, is_visible_qr, image_url) VALUES
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440000', 'Caldo de Mancarra', 'Sopa tradicional angolana com peixe e mandioca', 3500.00, 50, true, 'https://via.placeholder.com/300'),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Muamba de Galinha', 'Galinha cozinhada com muamba tradicional', 4500.00, 30, true, 'https://via.placeholder.com/300'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Fufu com Carne', 'Fufu tradicional acompanhado de carne seca', 4000.00, 25, true, 'https://via.placeholder.com/300'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440002', 'Mousse de Chocolate', 'Sobremesa cremosa de chocolate', 1500.00, 40, false, 'https://via.placeholder.com/300'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440003', 'Ginga com Coca-Cola', 'Bebida tradicional angolana', 1200.00, 100, true, 'https://via.placeholder.com/300'),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440004', 'Cuscuza', 'Petisco tradicional de cuscuza', 2500.00, 60, true, 'https://via.placeholder.com/300')
ON CONFLICT DO NOTHING;

-- Inserir configurações da aplicação
INSERT INTO public.app_settings (id, restaurant_name, currency, is_qr_enabled) VALUES
('550e8400-e29b-41d4-a716-446655440200', 'Tasca do Vereda', 'Kz', true)
ON CONFLICT DO NOTHING;

-- Inserir funcionários
INSERT INTO public.staff (id, full_name, role, base_salary_kz, phone, status) VALUES
('550e8400-e29b-41d4-a716-446655440300', 'Carlos Manuel', 'GARCOM', 150000.00, '+244923111111', 'active'),
('550e8400-e29b-41d4-a716-446655440301', 'Ana Beatriz', 'CAIXA', 120000.00, '+244923222222', 'active'),
('550e8400-e29b-41d4-a716-446655440302', 'Pedro Henrique', 'COZINHA', 200000.00, '+244923333333', 'active'),
('550e8400-e29b-41d4-a716-446655440303', 'Marta Sofia', 'GERENTE', 180000.00, '+244923444444', 'active')
ON CONFLICT DO NOTHING;

-- Inserir escalas de trabalho
INSERT INTO public.staff_schedules (id, staff_id, shift_start, shift_end, work_days) VALUES
('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440300', '08:00:00', '16:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440301', '08:00:00', '16:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440302', '10:00:00', '18:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440303', '08:00:00', '16:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
ON CONFLICT DO NOTHING;

-- Inserir clientes de exemplo
INSERT INTO public.customers (id, name, phone, email, address) VALUES
('550e8400-e29b-41d4-a716-446655440500', 'João Silva', '+244923123456', 'joao.silva@email.com', 'Rua Principal, 123, Luanda'),
('550e8400-e29b-41d4-a716-446655440501', 'Maria Santos', '+244923987654', 'maria.santos@email.com', 'Avenida 25 de Abril, 456, Luanda'),
('550e8400-e29b-41d4-a716-446655440502', 'Pedro Costa', '+244923456789', 'pedro.costa@email.com', 'Rua Comandante Valódias, 789, Benguela')
ON CONFLICT DO NOTHING;
