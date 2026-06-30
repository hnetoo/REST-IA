-- Adicionar colunas de cálculo de folha de salário à tabela staff
ALTER TABLE staff 
ADD COLUMN subsidios numeric DEFAULT 0,
ADD COLUMN bonus numeric DEFAULT 0,
ADD COLUMN horas_extras numeric DEFAULT 0,
ADD COLUMN descontos numeric DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN staff.subsidios IS 'Subsídios mensais do funcionário';
COMMENT ON COLUMN staff.bonus IS 'Bónus mensais do funcionário';
COMMENT ON COLUMN staff.horas_extras IS 'Valor das horas extras mensais';
COMMENT ON COLUMN staff.descontos IS 'Descontos mensais do funcionário';
