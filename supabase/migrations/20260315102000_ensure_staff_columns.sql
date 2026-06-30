-- Verificar e garantir que todas as colunas necessárias existam na tabela staff
DO $$
BEGIN
    -- Adicionar coluna salario_base se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'salario_base'
    ) THEN
        ALTER TABLE staff ADD COLUMN salario_base numeric DEFAULT 0;
    END IF;

    -- Adicionar coluna subsidios se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'subsidios'
    ) THEN
        ALTER TABLE staff ADD COLUMN subsidios numeric DEFAULT 0;
    END IF;

    -- Adicionar coluna bonus se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'bonus'
    ) THEN
        ALTER TABLE staff ADD COLUMN bonus numeric DEFAULT 0;
    END IF;

    -- Adicionar coluna horas_extras se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'horas_extras'
    ) THEN
        ALTER TABLE staff ADD COLUMN horas_extras numeric DEFAULT 0;
    END IF;

    -- Adicionar coluna descontos se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'descontos'
    ) THEN
        ALTER TABLE staff ADD COLUMN descontos numeric DEFAULT 0;
    END IF;

    -- Garantir que todos os registros tenham valores padrão
    UPDATE staff 
    SET 
        salario_base = COALESCE(salario_base, 0),
        subsidios = COALESCE(subsidios, 0),
        bonus = COALESCE(bonus, 0),
        horas_extras = COALESCE(horas_extras, 0),
        descontos = COALESCE(descontos, 0);
END $$;

-- Adicionar comentários
COMMENT ON COLUMN staff.salario_base IS 'Salário base mensal do funcionário';
COMMENT ON COLUMN staff.subsidios IS 'Subsídios mensais do funcionário';
COMMENT ON COLUMN staff.bonus IS 'Bónus mensais do funcionário';
COMMENT ON COLUMN staff.horas_extras IS 'Valor das horas extras mensais';
COMMENT ON COLUMN staff.descontos IS 'Descontos mensais do funcionário';
