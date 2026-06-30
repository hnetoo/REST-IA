-- 🔒 Adicionar coluna closed_by à tabela orders para rastreio de operador
-- Executar no Supabase Dashboard > SQL Editor

-- Adicionar coluna closed_by (nome do operador que fechou a venda)
ALTER TABLE "public"."orders" 
ADD COLUMN IF NOT EXISTS "closed_by" text;

-- Comentário para documentação
COMMENT ON COLUMN "public"."orders"."closed_by" IS 'Nome do operador que fechou a venda (anti-roubo/rastreabilidade)';

-- Verificar
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'closed_by';
