INSERT INTO cash_flow (amount, category, type, description, data_contabil, closed_by, created_at, updated_at)
VALUES (203600.00, 'FECHO_CAIXA', 'entrada', 'Fecho manual - 21 vendas', '2026-06-11', 'Admin', NOW(), NOW())
ON CONFLICT (category, data_contabil)
DO UPDATE SET
    amount = EXCLUDED.amount,
    description = EXCLUDED.description || ' (atualizado)',
    updated_at = NOW();
