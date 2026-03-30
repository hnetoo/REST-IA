-- 🌱 SEED SCRIPT - Restaurante App
-- Execute este script no SQL Editor do Supabase
-- Data: 2026-03-30

-- Categorias
INSERT INTO categories (id, name, icon, is_visible_digital, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Entradas', 'UtensilsCrossed', true, now(), now()),
  (gen_random_uuid(), 'Hambúrgueres', 'Beef', true, now(), now()),
  (gen_random_uuid(), 'Sanduíches', 'Sandwich', true, now(), now()),
  (gen_random_uuid(), 'Wraps', 'Wrap', true, now(), now()),
  (gen_random_uuid(), 'Pizzas', 'Pizza', true, now(), now()),
  (gen_random_uuid(), 'Hot Dogs', 'HotDog', true, now(), now()),
  (gen_random_uuid(), 'Saladas', 'Salad', true, now(), now()),
  (gen_random_uuid(), 'Pratos Principais', 'ChefHat', true, now(), now()),
  (gen_random_uuid(), 'Acompanhamentos', 'Fries', true, now(), now()),
  (gen_random_uuid(), 'Sobremesas', 'Cake', true, now(), now()),
  (gen_random_uuid(), 'Bebidas', 'GlassWater', true, now(), now()),
  (gen_random_uuid(), 'Cafetaria', 'Coffee', true, now(), now()),
  (gen_random_uuid(), 'Cocktails', 'Wine', true, now(), now());

-- Obter IDs das categorias para referência
DO $$
DECLARE
  cat_entradas UUID;
  cat_hamburgers UUID;
  cat_sanduiches UUID;
  cat_wraps UUID;
  cat_pizzas UUID;
  cat_hotdogs UUID;
  cat_saladas UUID;
  cat_pratos UUID;
  cat_acomp UUID;
  cat_sobremesas UUID;
  cat_bebidas UUID;
BEGIN
  SELECT id INTO cat_entradas FROM categories WHERE name = 'Entradas';
  SELECT id INTO cat_hamburgers FROM categories WHERE name = 'Hambúrgueres';
  SELECT id INTO cat_sanduiches FROM categories WHERE name = 'Sanduíches';
  SELECT id INTO cat_wraps FROM categories WHERE name = 'Wraps';
  SELECT id INTO cat_pizzas FROM categories WHERE name = 'Pizzas';
  SELECT id INTO cat_hotdogs FROM categories WHERE name = 'Hot Dogs';
  SELECT id INTO cat_saladas FROM categories WHERE name = 'Saladas';
  SELECT id INTO cat_pratos FROM categories WHERE name = 'Pratos Principais';
  SELECT id INTO cat_acomp FROM categories WHERE name = 'Acompanhamentos';
  SELECT id INTO cat_sobremesas FROM categories WHERE name = 'Sobremesas';
  SELECT id INTO cat_bebidas FROM categories WHERE name = 'Bebidas';

  -- Produtos - Entradas
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Batatas Fritas Pequenas', 800, 300, cat_entradas, 'Porção de 200g', true, now(), now()),
    (gen_random_uuid(), 'Batatas Fritas Grandes', 1200, 450, cat_entradas, 'Porção de 400g', true, now(), now()),
    (gen_random_uuid(), 'Aros de Cebola', 1000, 350, cat_entradas, '10 unidades crocantes', true, now(), now()),
    (gen_random_uuid(), 'Nuggets de Frango', 1500, 600, cat_entradas, '8 unidades com molho', true, now(), now()),
    (gen_random_uuid(), 'Mozzarella Sticks', 1400, 550, cat_entradas, '6 palitos de mozzarella', true, now(), now()),
    (gen_random_uuid(), 'Tiras de Frango Crocantes', 1600, 650, cat_entradas, '5 tiras grandes', true, now(), now()),
    (gen_random_uuid(), 'Nachos com Queijo', 1300, 480, cat_entradas, 'Com cheddar e jalapeños', true, now(), now()),
    (gen_random_uuid(), 'Bruschetta Italiana', 1100, 400, cat_entradas, '4 unidades com tomate e manjericão', true, now(), now());

  -- Produtos - Hambúrgueres
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Classic Burger', 2500, 900, cat_hamburgers, 'Carne 150g, queijo, alface, tomate', true, now(), now()),
    (gen_random_uuid(), 'Cheeseburger Duplo', 3500, 1300, cat_hamburgers, '2 carnes de 150g, duplo queijo', true, now(), now()),
    (gen_random_uuid(), 'Bacon Burger', 3200, 1200, cat_hamburgers, 'Carne 180g, bacon crocante, cheddar', true, now(), now()),
    (gen_random_uuid(), 'Chicken Burger', 2800, 1000, cat_hamburgers, 'Peito de frango grelhado 200g', true, now(), now()),
    (gen_random_uuid(), 'BBQ Burger', 3300, 1150, cat_hamburgers, 'Carne 180g, molho barbecue, cebola caramelizada', true, now(), now()),
    (gen_random_uuid(), 'Mushroom Swiss Burger', 3100, 1100, cat_hamburgers, 'Carne 180g, cogumelos, queijo suíço', true, now(), now()),
    (gen_random_uuid(), 'Spicy Jalapeño Burger', 3000, 1050, cat_hamburgers, 'Carne 180g, jalapeños, pimenta', true, now(), now()),
    (gen_random_uuid(), 'Veggie Burger', 2600, 950, cat_hamburgers, 'Hambúrguer de grão de bico 150g', true, now(), now()),
    (gen_random_uuid(), 'Fish Burger', 2900, 1100, cat_hamburgers, 'Filete de peixe empanado 180g', true, now(), now()),
    (gen_random_uuid(), 'Egg Bacon Burger', 3400, 1250, cat_hamburgers, 'Carne 180g, ovo frito, bacon', true, now(), now()),
    (gen_random_uuid(), 'Blue Cheese Burger', 3600, 1350, cat_hamburgers, 'Carne 200g, queijo azul, cebola caramelizada', true, now(), now()),
    (gen_random_uuid(), 'Guacamole Burger', 3300, 1200, cat_hamburgers, 'Carne 180g, guacamole, nachos', true, now(), now()),
    (gen_random_uuid(), 'Truffle Burger', 4500, 1800, cat_hamburgers, 'Carne 200g, azeite de trufas, cogumelos', true, now(), now()),
    (gen_random_uuid(), 'Pulled Pork Burger', 3800, 1400, cat_hamburgers, 'Carne de porco desfiada, coleslaw', true, now(), now()),
    (gen_random_uuid(), 'Surf & Turf Burger', 4200, 1650, cat_hamburgers, 'Carne 150g + camarão empanado', true, now(), now()),
    (gen_random_uuid(), 'Monster Burger', 5500, 2100, cat_hamburgers, '3 carnes de 150g, triplo queijo, bacon', true, now(), now());

  -- Produtos - Sanduíches
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Sanduíche de Frango', 2200, 800, cat_sanduiches, 'Peito de frango grelhado com maionese', true, now(), now()),
    (gen_random_uuid(), 'Club Sandwich', 2800, 1000, cat_sanduiches, 'Triplo andar com frango, bacon, ovo', true, now(), now()),
    (gen_random_uuid(), 'Sanduíche de Atum', 2400, 900, cat_sanduiches, 'Atum com alface e tomate', true, now(), now()),
    (gen_random_uuid(), 'Bauru', 2500, 950, cat_sanduiches, 'Presunto, queijo, tomate e orégano', true, now(), now()),
    (gen_random_uuid(), 'Sanduíche de Peru', 2300, 850, cat_sanduiches, 'Peito de peru defumado', true, now(), now()),
    (gen_random_uuid(), 'Philly Cheesesteak', 3200, 1200, cat_sanduiches, 'Carne fatiada, queijo derretido, pimentões', true, now(), now()),
    (gen_random_uuid(), 'Cubano', 3000, 1100, cat_sanduiches, 'Presunto, porco assado, queijo, picles', true, now(), now()),
    (gen_random_uuid(), 'Reuben', 3100, 1150, cat_sanduiches, 'Corned beef, chucrute, queijo suíço', true, now(), now()),
    (gen_random_uuid(), 'Sanduíche de Omelete', 1800, 650, cat_sanduiches, 'Omelete de queijo com ervas', true, now(), now()),
    (gen_random_uuid(), 'BLT', 2400, 900, cat_sanduiches, 'Bacon, alface, tomate, maionese', true, now(), now()),
    (gen_random_uuid(), 'Panini Caprese', 2200, 800, cat_sanduiches, 'Mozzarella, tomate, manjericão, pesto', true, now(), now()),
    (gen_random_uuid(), 'Sanduíche de Presunto Cru', 2900, 1100, cat_sanduiches, 'Prosciutto com rúcula e queijo brie', true, now(), now());

  -- Produtos - Wraps
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Wrap de Frango Caesar', 2500, 950, cat_wraps, 'Frango grelhado, alface, molho caesar', true, now(), now()),
    (gen_random_uuid(), 'Wrap de Atum', 2300, 880, cat_wraps, 'Atum com alface e tomate', true, now(), now()),
    (gen_random_uuid(), 'Wrap Vegetariano', 2100, 780, cat_wraps, 'Hummus, vegetais grelhados, rúcula', true, now(), now()),
    (gen_random_uuid(), 'Wrap de Falafel', 2200, 820, cat_wraps, 'Bolinhos de grão com tahine', true, now(), now()),
    (gen_random_uuid(), 'Wrap de Carne', 2800, 1050, cat_wraps, 'Carne grelhada, cebola caramelizada, queijo', true, now(), now()),
    (gen_random_uuid(), 'Wrap de Salmão', 3200, 1250, cat_wraps, 'Salmão defumado com cream cheese', true, now(), now());

  -- Produtos - Pizzas
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Pizza Margherita', 3500, 1200, cat_pizzas, 'Molho de tomate, mozzarella, manjericão', true, now(), now()),
    (gen_random_uuid(), 'Pizza Pepperoni', 4200, 1500, cat_pizzas, 'Pepperoni fatiado com mozzarella', true, now(), now()),
    (gen_random_uuid(), 'Pizza Quatro Queijos', 4500, 1600, cat_pizzas, 'Mozzarella, gorgonzola, parmesão, catupiry', true, now(), now()),
    (gen_random_uuid(), 'Pizza Frango com Catupiry', 4300, 1550, cat_pizzas, 'Frango desfiado, catupiry, milho', true, now(), now()),
    (gen_random_uuid(), 'Pizza Calabresa', 4000, 1450, cat_pizzas, 'Calabresa, cebola, azeitonas', true, now(), now()),
    (gen_random_uuid(), 'Pizza Vegetariana', 3800, 1350, cat_pizzas, 'Berinjela, abobrinha, pimentão, cogumelos', true, now(), now()),
    (gen_random_uuid(), 'Pizza Portuguesa', 4400, 1580, cat_pizzas, 'Presunto, ovos, cebola, azeitonas, ervilha', true, now(), now()),
    (gen_random_uuid(), 'Pizza Supreme', 4800, 1750, cat_pizzas, 'Pepperoni, pimentões, cebola, cogumelos', true, now(), now());

  -- Produtos - Hot Dogs
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Hot Dog Clássico', 1500, 550, cat_hotdogs, 'Salsicha, pão, mostarda, ketchup', true, now(), now()),
    (gen_random_uuid(), 'Hot Dog Completo', 2000, 750, cat_hotdogs, 'Salsicha, bacon, catupiry, batata palha', true, now(), now()),
    (gen_random_uuid(), 'Hot Dog Paulista', 2200, 850, cat_hotdogs, 'Salsicha, purê de batata, molho de tomate', true, now(), now()),
    (gen_random_uuid(), 'Hot Dog Chicago', 2500, 950, cat_hotdogs, 'Salsicha de carne, pimentão, picles, tomate', true, now(), now()),
    (gen_random_uuid(), 'Hot Dog Gourmet', 2800, 1050, cat_hotdogs, 'Salsicha artesanal, cebola caramelizada', true, now(), now()),
    (gen_random_uuid(), 'Choripán', 2400, 900, cat_hotdogs, 'Linguiça chorizo, chimichurri, pão crocante', true, now(), now());

  -- Produtos - Saladas
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Salada Caesar', 2500, 900, cat_saladas, 'Alface romana, croutons, parmesão, molho caesar', true, now(), now()),
    (gen_random_uuid(), 'Salada Grega', 2800, 1000, cat_saladas, 'Pepino, tomate, cebola, azeitonas, feta', true, now(), now()),
    (gen_random_uuid(), 'Salada Caprese', 2600, 950, cat_saladas, 'Tomate, mozzarella, manjericão, azeite', true, now(), now()),
    (gen_random_uuid(), 'Salada de Frango Grelhado', 3200, 1200, cat_saladas, 'Peito de frango, mix de folhas, croutons', true, now(), now()),
    (gen_random_uuid(), 'Salada de Salmão', 3800, 1500, cat_saladas, 'Salmão defumado, rúcula, cream cheese', true, now(), now()),
    (gen_random_uuid(), 'Salada Cobb', 3400, 1250, cat_saladas, 'Frango, bacon, ovo, abacate, queijo azul', true, now(), now());

  -- Produtos - Pratos Principais
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Filé Mignon', 6500, 2800, cat_pratos, '200g com molho madeira', true, now(), now()),
    (gen_random_uuid(), 'Risotto de Cogumelos', 4200, 1500, cat_pratos, 'Arroz arbóreo, cogumelos frescos, parmesão', true, now(), now()),
    (gen_random_uuid(), 'Salmão Grelhado', 5800, 2400, cat_pratos, 'Filé de salmão com legumes', true, now(), now()),
    (gen_random_uuid(), 'Strogonoff de Frango', 3500, 1300, cat_pratos, 'Com batata palha', true, now(), now()),
    (gen_random_uuid(), 'Lasagna à Bolonhesa', 3800, 1400, cat_pratos, 'Camadas de massa, carne, queijo, molho', true, now(), now()),
    (gen_random_uuid(), 'Camarão ao Alho', 5200, 2200, cat_pratos, 'Camarões salteados com alho e azeite', true, now(), now()),
    (gen_random_uuid(), 'Frango Parmegiana', 4000, 1500, cat_pratos, 'Peito empanado com molho e queijo', true, now(), now()),
    (gen_random_uuid(), 'Bife à Parmegiana', 4500, 1700, cat_pratos, 'Contra-filé empanado', true, now(), now());

  -- Produtos - Acompanhamentos
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Arroz Branco', 800, 250, cat_acomp, 'Porção individual', true, now(), now()),
    (gen_random_uuid(), 'Arroz à Grega', 1000, 350, cat_acomp, 'Com legumes e passas', true, now(), now()),
    (gen_random_uuid(), 'Purê de Batatas', 900, 300, cat_acomp, 'Com manteiga', true, now(), now()),
    (gen_random_uuid(), 'Legumes Salteados', 1200, 450, cat_acomp, 'Mix de legumes da estação', true, now(), now()),
    (gen_random_uuid(), 'Batata Rústica', 1100, 400, cat_acomp, 'Com alecrim e alho', true, now(), now()),
    (gen_random_uuid(), 'Farofa Crocante', 600, 200, cat_acomp, 'Com bacon e ovos', true, now(), now());

  -- Produtos - Sobremesas
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Cheesecake', 1800, 650, cat_sobremesas, 'Com calda de frutas vermelhas', true, now(), now()),
    (gen_random_uuid(), 'Tiramisù', 2000, 750, cat_sobremesas, 'Clássico italiano com café', true, now(), now()),
    (gen_random_uuid(), 'Pudim de Leite', 1400, 500, cat_sobremesas, 'Cremoso com calda de caramelo', true, now(), now()),
    (gen_random_uuid(), 'Brownie com Sorvete', 2200, 800, cat_sobremesas, 'Brownie quente com bola de baunilha', true, now(), now()),
    (gen_random_uuid(), 'Mousse de Chocolate', 1600, 600, cat_sobremesas, 'Cremoso e aerado', true, now(), now()),
    (gen_random_uuid(), 'Torta de Maçã', 1700, 650, cat_sobremesas, 'Fatia com canela e sorvete', true, now(), now()),
    (gen_random_uuid(), 'Sorvete Artesanal', 1200, 450, cat_sobremesas, '2 bolas, sabores variados', true, now(), now()),
    (gen_random_uuid(), 'Petit Gateau', 2500, 900, cat_sobremesas, 'Bolo quente com sorvete', true, now(), now());

  -- Produtos - Bebidas
  INSERT INTO products (id, name, price, cost_price, category_id, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Refrigerante Lata', 700, 280, cat_bebidas, '350ml', true, now(), now()),
    (gen_random_uuid(), 'Refrigerante 600ml', 1200, 480, cat_bebidas, 'Garrafa', true, now(), now()),
    (gen_random_uuid(), 'Água Mineral 500ml', 500, 200, cat_bebidas, 'Sem gás', true, now(), now()),
    (gen_random_uuid(), 'Água com Gás 500ml', 600, 240, cat_bebidas, 'Com gás', true, now(), now()),
    (gen_random_uuid(), 'Suco Natural', 1500, 550, cat_bebidas, 'Laranja ou maracujá 400ml', true, now(), now()),
    (gen_random_uuid(), 'Chá Gelado', 1000, 380, cat_bebidas, 'Limão ou pêssego 400ml', true, now(), now()),
    (gen_random_uuid(), 'Cerveja Long Neck', 1800, 700, cat_bebidas, '355ml', true, now(), now());

  -- Funcionários
  INSERT INTO staff (id, full_name, role, base_salary_kz, phone, status, subsidios, bonus, horas_extras, descontos, salario_base, created_at) VALUES
    (gen_random_uuid(), 'João Silva', 'Gerente', 450000, '923456789', 'active', 0, 0, 0, 0, 450000, now()),
    (gen_random_uuid(), 'Maria Santos', 'Chef de Cozinha', 380000, '912345678', 'active', 0, 0, 0, 0, 380000, now()),
    (gen_random_uuid(), 'Pedro Oliveira', 'Cozinheiro', 250000, '934567890', 'active', 0, 0, 0, 0, 250000, now()),
    (gen_random_uuid(), 'Ana Ferreira', 'Garçonete', 180000, '945678901', 'active', 0, 0, 0, 0, 180000, now()),
    (gen_random_uuid(), 'Carlos Rodrigues', 'Garçom', 180000, '956789012', 'active', 0, 0, 0, 0, 180000, now()),
    (gen_random_uuid(), 'Beatriz Costa', 'Atendente Caixa', 200000, '967890123', 'active', 0, 0, 0, 0, 200000, now()),
    (gen_random_uuid(), 'Fernando Lima', 'Auxiliar de Cozinha', 150000, '978901234', 'active', 0, 0, 0, 0, 150000, now()),
    (gen_random_uuid(), 'Juliana Martins', 'Garçonete', 180000, '989012345', 'active', 0, 0, 0, 0, 180000, now()),
    (gen_random_uuid(), 'Ricardo Almeida', 'Barman', 220000, '990123456', 'active', 0, 0, 0, 0, 220000, now()),
    (gen_random_uuid(), 'Luciana Pereira', 'Recepcionista', 190000, '901234567', 'active', 0, 0, 0, 0, 190000, now());

  -- External History
  INSERT INTO external_history (id, source_name, total_revenue, gross_profit, period, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Sistema Legacy', 8000000, 6000000, 'historico', now(), now());

  RAISE NOTICE '🌱 Seed concluído!';
  RAISE NOTICE '✅ 13 categorias inseridas';
  RAISE NOTICE '✅ 91 produtos inseridos';
  RAISE NOTICE '✅ 10 funcionários inseridos';
  RAISE NOTICE '🚀 Faça uma venda de teste no POS!';
END $$;
