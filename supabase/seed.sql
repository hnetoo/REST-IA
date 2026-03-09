-- Dados iniciais para o Tasca do Vereda
-- Executar após criar o schema

-- Inserir categorias do menu
INSERT INTO menu_categories (id, name, icon, is_visible_digital) VALUES
('cat-1', 'Entradas', 'Soup', true),
('cat-2', 'Pratos Principais', 'ChefHat', true),
('cat-3', 'Sobremesas', 'IceCream', true),
('cat-4', 'Bebidas', 'Coffee', true),
('cat-5', 'Petiscos', 'UtensilsCrossed', true)
ON CONFLICT DO NOTHING;

-- Inserir pratos
INSERT INTO dishes (id, name, price, cost_price, category_id, description, is_visible_digital, is_featured) VALUES
('dish-1', 'Caldo de Mancarra', 3500.00, 2500.00, 'cat-1', 'Sopa tradicional angolana com peixe e mandioca', true, true),
('dish-2', 'Muamba de Galinha', 4500.00, 3200.00, 'cat-2', 'Galinha cozinhada com muamba tradicional', true, true),
('dish-3', 'Fufu com Carne', 4000.00, 2800.00, 'cat-2', 'Fufu tradicional acompanhado de carne seca', true, false),
('dish-4', 'Mousse de Chocolate', 1500.00, 800.00, 'cat-3', 'Sobremesa cremosa de chocolate', true, false),
('dish-5', 'Ginga com Coca-Cola', 1200.00, 600.00, 'cat-4', 'Bebida tradicional angolana', true, true),
('dish-6', 'Cuscuza', 2500.00, 1500.00, 'cat-5', 'Petisco tradicional de cuscuza', true, true),
('dish-7', 'Calulu', 5000.00, 3500.00, 'cat-2', 'Calulu de peixe com quiabo e mandioca', true, true),
('dish-8', 'Pudim de Leite', 1200.00, 600.00, 'cat-3', 'Pudim cremoso tradicional', true, false)
ON CONFLICT DO NOTHING;

-- Inserir mesas
INSERT INTO tables (id, name, seats, x, y, zone, shape) VALUES
(1, 'Mesa 1', 4, 50, 50, 'INTERIOR', 'SQUARE'),
(2, 'Mesa 2', 4, 200, 50, 'INTERIOR', 'SQUARE'),
(3, 'Mesa 3', 6, 350, 50, 'INTERIOR', 'ROUND'),
(4, 'Mesa 4', 2, 50, 200, 'INTERIOR', 'SQUARE'),
(5, 'Mesa 5', 4, 200, 200, 'INTERIOR', 'SQUARE'),
(6, 'Mesa 6', 8, 350, 200, 'INTERIOR', 'ROUND'),
(7, 'Mesa 7', 4, 50, 350, 'EXTERIOR', 'SQUARE'),
(8, 'Mesa 8', 6, 200, 350, 'EXTERIOR', 'ROUND'),
(9, 'Mesa VIP', 10, 350, 350, 'EXTERIOR', 'ROUND'),
(10, 'Balcao 1', 2, 50, 450, 'BALCAO', 'SQUARE'),
(11, 'Balcao 2', 2, 200, 450, 'BALCAO', 'SQUARE')
ON CONFLICT DO NOTHING;

-- Inserir clientes de exemplo
INSERT INTO customers (id, name, phone, nif, points, balance, visits) VALUES
('cust-1', 'João Silva', '+244923123456', '123456789', 150, 0.00, 12),
('cust-2', 'Maria Santos', '+244923987654', '987654321', 280, 15000.00, 25),
('cust-3', 'Pedro Costa', '+244923456789', '456789123', 50, 0.00, 8),
('cust-4', 'Ana Fernandes', '+244923789456', '789456123', 320, 7500.00, 30)
ON CONFLICT DO NOTHING;

-- Inserir itens de estoque
INSERT INTO stock_items (id, name, quantity, unit, min_threshold) VALUES
('stock-1', 'Farinha de Mandioca', 50.00, 'kg', 10.00),
('stock-2', 'Peixe Fresco', 20.00, 'kg', 5.00),
('stock-3', 'Galinha', 30.00, 'un', 10.00),
('stock-4', 'Óleo de Palma', 25.00, 'l', 5.00),
('stock-5', 'Tomate', 15.00, 'kg', 3.00),
('stock-6', 'Cebola', 20.00, 'kg', 5.00),
('stock-7', 'Quiabo', 10.00, 'kg', 2.00),
('stock-8', 'Arroz', 100.00, 'kg', 20.00),
('stock-9', 'Feijão', 50.00, 'kg', 10.00),
('stock-10', 'Sal', 30.00, 'kg', 5.00)
ON CONFLICT DO NOTHING;

-- Inserir funcionários
INSERT INTO employees (id, name, role, phone, salary, status, color, work_days_per_month, daily_work_hours) VALUES
('emp-1', 'Carlos Manuel', 'GARCOM', '+244923111111', 150000.00, 'ATIVO', '#10B981', 22, 8.0),
('emp-2', 'Ana Beatriz', 'CAIXA', '+244923222222', 180000.00, 'ATIVO', '#3B82F6', 22, 8.0),
('emp-3', 'Pedro Henrique', 'COZINHA', '+244923333333', 200000.00, 'ATIVO', '#F59E0B', 22, 8.0),
('emp-4', 'Marta Sofia', 'GARCOM', '+244923444444', 150000.00, 'ATIVO', '#10B981', 22, 6.0),
('emp-5', 'Luís Alberto', 'ADMIN', '+244923555555', 350000.00, 'ATIVO', '#8B5CF6', 22, 8.0)
ON CONFLICT DO NOTHING;

-- Inserir turnos de trabalho
INSERT INTO work_shifts (id, employee_id, day_of_week, start_time, end_time) VALUES
('shift-1', 'emp-1', 1, '08:00:00', '16:00:00'), -- Segunda
('shift-2', 'emp-1', 2, '08:00:00', '16:00:00'), -- Terça
('shift-3', 'emp-1', 3, '08:00:00', '16:00:00'), -- Quarta
('shift-4', 'emp-1', 4, '08:00:00', '16:00:00'), -- Quinta
('shift-5', 'emp-1', 5, '08:00:00', '16:00:00'), -- Sexta
('shift-6', 'emp-1', 6, '10:00:00', '18:00:00'), -- Sábado
('shift-7', 'emp-2', 1, '08:00:00', '16:00:00'),
('shift-8', 'emp-2', 2, '08:00:00', '16:00:00'),
('shift-9', 'emp-2', 3, '08:00:00', '16:00:00'),
('shift-10', 'emp-2', 4, '08:00:00', '16:00:00'),
('shift-11', 'emp-2', 5, '08:00:00', '16:00:00'),
('shift-12', 'emp-2', 6, '10:00:00', '18:00:00'),
('shift-13', 'emp-3', 1, '10:00:00', '18:00:00'),
('shift-14', 'emp-3', 2, '10:00:00', '18:00:00'),
('shift-15', 'emp-3', 3, '10:00:00', '18:00:00'),
('shift-16', 'emp-3', 4, '10:00:00', '18:00:00'),
('shift-17', 'emp-3', 5, '10:00:00', '18:00:00'),
('shift-18', 'emp-3', 6, '12:00:00', '20:00:00')
ON CONFLICT DO NOTHING;

-- Inserir algumas reservas de exemplo
INSERT INTO reservations (id, customer_name, date, people, status, table_id, notes) VALUES
('res-1', 'João Silva', '2025-01-20 20:00:00', 4, 'CONFIRMADA', 3, 'Aniversário de casamento'),
('res-2', 'Maria Santos', '2025-01-21 19:30:00', 6, 'PENDENTE', 6, 'Jantar de negócios'),
('res-3', 'Pedro Costa', '2025-01-22 13:00:00', 2, 'CONFIRMADA', 1, 'Almoço de família'),
('res-4', 'Ana Fernandes', '2025-01-23 21:00:00', 8, 'PENDENTE', 9, 'Festa de aniversário')
ON CONFLICT DO NOTHING;
