-- Adicionar coluna salario_base e garantir estrutura completa da tabela staff
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS salario_base numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS subsidios numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_extras numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS descontos numeric DEFAULT 0;

-- Garantir que todos os registros existentes tenham valores padrão
UPDATE staff 
SET 
  salario_base = COALESCE(salario_base, 0),
  subsidios = COALESCE(subsidios, 0),
  bonus = COALESCE(bonus, 0),
  horas_extras = COALESCE(horas_extras, 0),
  descontos = COALESCE(descontos, 0);

-- Adicionar comentários para documentação
COMMENT ON COLUMN staff.salario_base IS 'Salário base mensal do funcionário';
COMMENT ON COLUMN staff.subsidios IS 'Subsídios mensais do funcionário';
COMMENT ON COLUMN staff.bonus IS 'Bónus mensais do funcionário';
COMMENT ON COLUMN staff.horas_extras IS 'Valor das horas extras mensais';
COMMENT ON COLUMN staff.descontos IS 'Descontos mensais do funcionário';
