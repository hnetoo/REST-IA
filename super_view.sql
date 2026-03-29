-- 🔑 SUPER VIEW - final_business_summary
-- Criada com base nos NOMES REAIS das colunas do schema.prisma
-- Para consolidar todos os dados do Dashboard numa única view

CREATE OR REPLACE VIEW final_business_summary AS

-- 🔑 COMENTÁRIOS EXPLICATIVOS
/*
ESTRUTURA DA VIEW:

COLUNAS PRINCIPAIS:
- total_historico: 8.000.000 Kz (external_history.total_revenue)
- total_vendas: Soma de orders.total_amount (status = 'closed')
- total_custos_produtos: Soma de (order_items.quantity * (products.price - products.cost_price))
- total_despesas: Soma de expenses.amount_kz (status = 'pago')
- total_salarios: Soma de staff.base_salary_kz (status = 'active')

CÁLCULOS:
- faturacao_total = total_historico + total_vendas
- custos_totais = total_custos_produtos + total_despesas + total_salarios
- lucro_liquido = faturacao_total - custos_totais
- margem_lucro_percentagem = (lucro_liquido / faturacao_total) * 100

USO NO DASHBOARD:
SELECT * FROM final_business_summary ORDER BY data_ultima_atualizacao DESC LIMIT 1;

NOTAS:
- Todos os valores em Kz (Decimal)
- Fuso horário: GMT+1 (Angola)
- Atualização em tempo real via CURRENT_TIMESTAMP
*/
