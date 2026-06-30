-- ATIVAÇÃO DO REALTIME PARA TABELAS CRÍTICAS
-- Execute este SQL no Supabase após o Prisma db push

-- Adicionar tabelas ao publication supabase_realtime
alter publication supabase_realtime add table "orders";
alter publication supabase_realtime add table "order_items";
alter publication supabase_realtime add table "products";

-- Verificar se as tabelas foram adicionadas
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Opcional: Adicionar categorias para atualizações em tempo real
alter publication supabase_realtime add table "categories";

-- Nota: Isso permite que o frontend receba atualizações em tempo real
-- quando novos pedidos são criados ou produtos são atualizados
