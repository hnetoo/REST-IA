const fs = require('fs');

const manualAdmin = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>Manual Administrador</title>
<style>
body{font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.7;padding:40px}
.container{max-width:900px;margin:0 auto}
h1{font-size:2.5rem;font-weight:900;color:#a855f7;margin-bottom:10px;text-transform:uppercase}
.version{font-size:.75rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:40px}
h2{font-size:1.25rem;font-weight:800;color:#a855f7;margin:40px 0 20px;padding-bottom:10px;border-bottom:2px solid rgba(168,85,247,.2);text-transform:uppercase;letter-spacing:.05em}
h3{font-size:1rem;font-weight:700;color:#fff;margin:25px 0 12px}
h4{font-size:.9rem;font-weight:600;color:#cbd5e1;margin:18px 0 8px}
p{margin-bottom:15px;color:#94a3b8}
ul{margin:15px 0 20px 25px}
li{margin-bottom:10px;color:#94a3b8}
strong{color:#fff;font-weight:600}
.warning{background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:12px;padding:16px 20px;margin:20px 0}
.warning strong{color:#eab308}
.tip{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:12px;padding:16px 20px;margin:20px 0}
.tip strong{color:#22c55e}
.danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:16px 20px;margin:20px 0}
.danger strong{color:#ef4444}
.step-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 20px;margin:12px 0}
.step-box p{margin-bottom:8px}
.step-box p:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;margin:15px 0;font-size:.875rem;border-radius:12px;overflow:hidden}
th{background:rgba(168,85,247,.12);color:#a855f7;font-weight:700;text-transform:uppercase;font-size:.7rem;letter-spacing:.08em;padding:1rem;text-align:left}
td{padding:.875rem 1rem;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.05)}
tr:hover td{background:rgba(255,255,255,.02)}
</style></head>
<body>
<div class="container">
<h1>Manual do Administrador</h1>
<p class="version">REST IA OS v1.0.6 — Tasca do Vereda</p>

<h2><span class="section-number">1</span> Dashboard & Analytics</h2>
<p>O Dashboard e o painel de controlo principal. Mostra a saude financeira do restaurante em tempo real.</p>

<h3>1.1 Cards Principais — O que cada um mostra</h3>
<div class="step-box">
<p><strong>Rendimento Global:</strong> Faturamento total acumulado desde o inicio do ano. Inclui todas as vendas com status "closed" ou "paid". E o indicador chave do desempenho ao longo do tempo.</p>
<p><strong>Faturamento Hoje:</strong> Total de vendas do dia corrente. Atualiza em tempo real via Motor SyncCore. Se estiver offline, mostra o ultimo valor conhecido.</p>
<p><strong>Despesas Totais:</strong> Soma de todas as despesas registadas: compras, salarios, aluguer, luz/agua, marketing, outros. Atualiza conforme despesas sao registadas.</p>
<p><strong>Folha Salarial:</strong> Custo total com funcionarios do mes corrente. Inclui salarios base + subsidios + horas extras − INSS − IRT.</p>
<p><strong>Impostos (7%):</strong> IVA estimado sobre o faturamento. Em Angola a taxa simplificada e 7%. Calculado automaticamente sobre todas as vendas.</p>
<p><strong>Custos Totais:</strong> Soma de Despesas Totais + Folha Salarial. Representa tudo o que o restaurante gastou no periodo.</p>
</div>

<h3>1.2 Graficos — Como interpretar</h3>
<div class="step-box">
<p><strong>Vendas por Hora:</strong> Mostra o volume de vendas em cada hora (tipicamente 08h-23h). Use para:</p>
<ul>
<li>Identificar picos de movimento e ajustar turnos de staff</li>
<li>Preparar stock antecipadamente antes dos picos</li>
<li>Identificar horas mortas para fazer promocoes</li>
</ul>
<p><strong>Top Produtos:</strong> Lista os 10 produtos mais vendidos por quantidade. Use para:</p>
<ul>
<li>Identificar o que mais sai e ajustar stock</li>
<li>Decidir promocoes nos produtos menos vendidos</li>
<li>Negociar melhores precos com fornecedores dos tops</li>
</ul>
<p><strong>Vendas por Categoria:</strong> Compara Bebidas vs Comida vs Sobremesas em percentagem. Use para:</p>
<ul>
<li>Entender o perfil de consumo dos clientes</li>
<li>Ajustar precos e margens por categoria</li>
<li>Identificar oportunidades de cross-selling</li>
</ul>
</div>
<div class="tip"><strong>DICA:</strong> Todos os graficos atualizam em tempo real. Deixe o Dashboard aberto num ecra secundario para monitorizacao continua.</div>

<h2><span class="section-number">2</span> Centro de Lucro</h2>
<p>O Centro de Lucro monitora a saude financeira em tempo real com inteligencia artificial.</p>

<h3>2.1 Controlo de Margens</h3>
<div class="step-box">
<p><strong>Formula do Lucro:</strong> Lucro Liquido = Receitas − Despesas − Salarios − Impostos</p>
<p>O sistema calcula automaticamente a margem de lucro atual e compara com meses anteriores.</p>
<p><strong>Alertas automaticos:</strong> Se o lucro descer abaixo do limite definido nas configuracoes, recebe uma notificacao no Dashboard.</p>
</div>

<h3>2.2 Previsoes do Motor SyncCore</h3>
<div class="step-box">
<p>O Motor SyncCore analisa dados historicos e faz previsoes como:</p>
<ul>
<li>"Stock de cerveja acaba em 3 dias"</li>
<li>"Sabado esperado: 150 clientes"</li>
<li>"Margem de lucro abaixo do esperado para esta semana"</li>
<li>"Despesa com luz 20% acima da media"</li>
</ul>
<p>Estas previsoes aparecem no Centro de Lucro e no Dashboard.</p>
</div>

<h2><span class="section-number">3</span> Financeiro Legal</h2>

<h3>3.1 Fluxo de Caixa — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Financeiro → Fluxo de Caixa.</p>
<p><strong>Passo 2:</strong> O ecra mostra entradas (vendas do POS) e saidas (despesas) por dia.</p>
<p><strong>Passo 3:</strong> O saldo e calculado automaticamente: Saldo = Entradas − Saidas.</p>
<p><strong>Passo 4:</strong> Use os filtros para ver por periodo (dia/semana/mes/ano).</p>
<p><strong>Passo 5:</strong> Clique num dia especifico para ver o detalhe de todas as transacoes.</p>
</div>

<h3>3.2 Despesas — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Financeiro → Despesas.</p>
<p><strong>Passo 2:</strong> Clique em "NOVA DESPESA".</p>
<p><strong>Passo 3:</strong> Preencha:</p>
<ul>
<li><strong>Descricao:</strong> O que foi comprado/pago (ex: "Aluguer de Marco")</li>
<li><strong>Valor:</strong> Montante em Kwanza (ex: 500.000 Kz)</li>
<li><strong>Data:</strong> Quando ocorreu a despesa</li>
<li><strong>Categoria:</strong> Compras, Salarios, Aluguer, Luz/Agua, Marketing, Outros</li>
<li><strong>Anexo:</strong> Foto ou PDF do recibo/fatura</li>
</ul>
<p><strong>Passo 4:</strong> Selecione o estado: <strong>Pendente</strong> (ainda nao pago), <strong>Pago</strong> (ja foi pago), ou <strong>Cancelado</strong>.</p>
<p><strong>Passo 5:</strong> Guarde a despesa.</p>
</div>

<h3>3.3 AGT — Controlo Fiscal — Passo a Passo</h3>
<div class="step-box">
<p><strong>Registo de NIFs:</strong> Nas vendas do POS, antes de fechar conta, registe o NIF do cliente (9 digitos) para faturas com IVA.</p>
<p><strong>Exportacao SAF-T:</strong></p>
<p><strong>Passo 1:</strong> Aceda a Financeiro → AGT.</p>
<p><strong>Passo 2:</strong> Selecione o periodo (mes/ano).</p>
<p><strong>Passo 3:</strong> Clique em "EXPORTAR SAF-T".</p>
<p><strong>Passo 4:</strong> O ficheiro e gerado no formato OGA 2024 exigido pela AGT.</p>
<p><strong>Passo 5:</strong> Guarde o ficheiro e submeta no portal da AGT.</p>
<p><strong>Relatorio mensal de IVA:</strong></p>
<p><strong>Passo 1:</strong> Financeiro → AGT → Relatorio de IVA.</p>
<p><strong>Passo 2:</strong> Selecione o mes.</p>
<p><strong>Passo 3:</strong> O sistema calcula o IVA liquidado (7% sobre o faturamento do mes).</p>
<p><strong>Passo 4:</strong> Exporte o relatorio em PDF.</p>
</div>
<div class="warning"><strong>ATENCAO:</strong> A taxa de IVA simplificada em Angola e de 7%. Mantenha todos os recibos e faturas organizados por mes para auditoria.</div>

<h2><span class="section-number">4</span> Menu & Stock</h2>

<h3>4.1 Gestao de Produtos — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Menu & Stock → Produtos.</p>
<p><strong>Passo 2:</strong> Clique em "NOVO PRODUTO".</p>
<p><strong>Passo 3:</strong> Preencha:</p>
<ul>
<li><strong>Nome:</strong> Nome do prato/bebida (ex: "Mufete de Peixe Grelhado")</li>
<li><strong>Descricao:</strong> Ingredientes e detalhes (aparece no menu digital)</li>
<li><strong>Preco de venda:</strong> Valor que o cliente paga (ex: 5.000 Kz)</li>
<li><strong>Custo de producao:</strong> Custo dos ingredientes (ex: 2.000 Kz)</li>
<li><strong>Categoria:</strong> Entradas, Pratos Principais, Bebidas, Sobremesas</li>
<li><strong>Imagem:</strong> Foto do prato (aparece no menu digital)</li>
</ul>
<p><strong>Passo 4:</strong> O sistema calcula automaticamente a <strong>margem de lucro</strong> = Preco − Custo.</p>
<p><strong>Passo 5:</strong> Defina stock inicial (ex: 50 unidades) e stock minimo (ex: 10).</p>
<p><strong>Passo 6:</strong> Assinale "Activo" para aparecer no POS. "Inactivo" esconde do POS.</p>
<p><strong>Passo 7:</strong> Guarde o produto.</p>
</div>
<div class="tip"><strong>DICA:</strong> Produtos com margem negativa (custo > preco) aparecem em vermelho. Ajuste precos ou custos imediatamente.</div>

<h3>4.2 Inventario Fisico — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Menu & Stock → Inventario.</p>
<p><strong>Passo 2:</strong> O sistema mostra a lista de todos os produtos com stock do sistema.</p>
<p><strong>Passo 3:</strong> Para cada produto, conte o stock real (na prateleira/armazem).</p>
<p><strong>Passo 4:</strong> Insira o stock real no campo correspondente.</p>
<p><strong>Passo 5:</strong> Se houver diferenca, o sistema pergunta o motivo: "Venda nao registada", "Quebra", "Outro".</p>
<p><strong>Passo 6:</strong> Clique em "AJUSTAR STOCK". O sistema regista o ajuste e atualiza o stock.</p>
</div>
<div class="warning"><strong>IMPORTANTE:</strong> Faca inventario fisico pelo menos uma vez por semana para evitar rupturas de stock e perdas.</div>

<h2><span class="section-number">5</span> Compras & Aprovacoes</h2>

<h3>5.1 Fluxo de Aprovacao — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1 (Funcionario):</strong> Cria pedido de compra em Compras → Novo Pedido.</p>
<p><strong>Passo 2 (Sistema):</strong> Envia notificacao ao Administrador/Owner.</p>
<p><strong>Passo 3 (Administrador):</strong> Recebe notificacao e analisa o pedido.</p>
<p><strong>Passo 4 (Administrador):</strong> Pode Aprovar, Rejeitar, ou Pedir mais Informacoes.</p>
<p><strong>Passo 5 (Owner — remoto):</strong> O Owner pode aprovar via Owner Hub em https://rest-ia.vercel.app/owner.</p>
<p><strong>Passo 6 (Apos Aprovacao):</strong> O pedido muda para "Aprovado".</p>
<p><strong>Passo 7:</strong> A compra e executada e a entrada de stock e registada automaticamente.</p>
</div>

<h3>5.2 Cadastro de Fornecedores</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Compras → Fornecedores.</p>
<p><strong>Passo 2:</strong> Clique em "NOVO FORNECEDOR".</p>
<p><strong>Passo 3:</strong> Preencha: Nome, NIF, Telefone, Email, Endereco.</p>
<p><strong>Passo 4:</strong> Guarde. O sistema passa a mostrar historico de compras por fornecedor.</p>
</div>
<div class="tip"><strong>DICA:</strong> Use o historico de compras para negociar melhores precos. Mostre ao fornecedor quanto comprou no ultimo ano.</div>

<h2><span class="section-number">6</span> Capital Humano (Folha de Salario)</h2>

<h3>6.1 Cadastro de Funcionarios — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Capital Humano → Funcionarios.</p>
<p><strong>Passo 2:</strong> Clique em "ADICIONAR FUNCIONARIO".</p>
<p><strong>Passo 3:</strong> Preencha:</p>
<ul>
<li><strong>Nome completo:</strong> Nome real do funcionario</li>
<li><strong>Cargo:</strong> Garcom, Cozinheiro, Auxiliar, Gerente, Administrativo, Outro</li>
<li><strong>NIF:</strong> 9 digitos numericos (ex: 123456789)</li>
<li><strong>Salario base:</strong> Valor mensal bruto em Kwanza (ex: 150.000 Kz)</li>
<li><strong>Tipo de contrato:</strong> Indeterminado, Determinado (com prazo), Servico</li>
<li><strong>Subsídios:</strong> Alimentacao, Transporte, Bonus (se aplicavel)</li>
</ul>
<p><strong>Passo 4:</strong> Assinale "Isencao de IRT" apenas se o funcionario tiver deficiencia reconhecida ou for combatente.</p>
<p><strong>Passo 5:</strong> Clique em "GUARDAR FUNCIONARIO".</p>
</div>

<h3>6.2 Processamento da Folha Salarial — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Capital Humano → Folha de Salario.</p>
<p><strong>Passo 2:</strong> Clique em "INICIAR PROCESSAMENTO DO MES" (ex: Junho 2026).</p>
<p><strong>Passo 3:</strong> O sistema carrega todos os funcionarios activos com salarios e subsidios.</p>
<p><strong>Passo 4:</strong> Para cada funcionario, adicione ajustes:</p>
<ul>
<li><strong>Horas Extras:</strong> Valor positivo (ex: +20.000 Kz). So preencha se houver.</li>
<li><strong>Outros Descontos:</strong> Valor negativo (ex: −5.000 Kz). So preencha se houver.</li>
</ul>
<p><strong>Passo 5:</strong> O sistema calcula AUTOMATICAMENTE:</p>
<ul>
<li><strong>BRUTO</strong> = Salario Base + Subsidios + Horas Extras</li>
<li><strong>INSS (3%)</strong> = 3% do (Salario Base + Bonus)</li>
<li><strong>IRT</strong> = consulta tabela progressiva OGE 2024</li>
<li><strong>LIQUIDO</strong> = Bruto − INSS − IRT − Outros Descontos</li>
</ul>
<p><strong>Passo 6:</strong> Verifique os valores de cada funcionario.</p>
<p><strong>Passo 7:</strong> Clique em "FECHAR E PROCESSAR FOLHA".</p>
<p><strong>Passo 8:</strong> A folha e gravada no Supabase com numero de recibo: RV-AAAA-MM-NNN (ex: RV-2026-06-001).</p>
<p><strong>Passo 9:</strong> Pode imprimir recibos individuais ou a folha completa A4.</p>
</div>
<div class="danger"><strong>SEGURANCA:</strong> Depois de fechada, a folha NAO pode ser alterada. Verifique tudo antes de confirmar.</div>

<h3>6.3 Tabela IRT — OGE 2024</h3>
<table>
<tr><th>Escalao</th><th>Base de Calculo</th><th>Taxa</th></tr>
<tr><td>1</td><td>Ate 70.000 Kz</td><td>10%</td></tr>
<tr><td>2</td><td>70.001 — 100.000 Kz</td><td>13%</td></tr>
<tr><td>3</td><td>100.001 — 150.000 Kz</td><td>16%</td></tr>
<tr><td>4</td><td>150.001 — 200.000 Kz</td><td>18,5%</td></tr>
<tr><td>5</td><td>200.001 — 300.000 Kz</td><td>19%</td></tr>
<tr><td>6</td><td>300.001 — 500.000 Kz</td><td>20%</td></tr>
<tr><td>7</td><td>Acima de 500.000 Kz</td><td>21%</td></tr>
<tr><td colspan="3">Salarios ate 100.000 Kz sao isentos de IRT</td></tr>
</table>
<div class="tip"><strong>NOTA:</strong> A folha e arquivada no Supabase com recibo sequencial e hash de validacao.</div>

<h2><span class="section-number">7</span> Relatorios</h2>

<h3>7.1 Tipos de Relatorios e como usar</h3>
<div class="step-box">
<p><strong>Vendas por Periodo:</strong> Filtre por dia, semana ou mes. Mostra total de vendas, numero de transacoes, ticket medio. Use para identificar tendencias sazonais. Exporte para Excel.</p>
<p><strong>Vendas por Funcionario:</strong> Mostra quanto cada funcionario vendeu no POS. Use para comissoes e avaliacao de performance.</p>
<p><strong>Vendas por Produto:</strong> Lista todos os produtos ordenados por quantidade vendida. Use para ajustar stock e precos.</p>
<p><strong>Movimentacao de Stock:</strong> Mostra todas as entradas (compras) e saidas (vendas/consumo interno). Use para rastrear discrepancias.</p>
<p><strong>Fluxo de Caixa:</strong> Entradas e saidas com saldo por dia. Use para reconciliacao bancaria.</p>
<p><strong>Folha Salarial:</strong> Resumo mensal com INSS, IRT e valores liquidos por funcionario.</p>
<p><strong>Despesas:</strong> Agrupadas por categoria e fornecedor. Use para controlo orcamental.</p>
</div>

<h3>7.2 Exportar Relatorios</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Abra o relatorio desejado.</p>
<p><strong>Passo 2:</strong> Clique no botao "EXPORTAR" no canto superior direito.</p>
<p><strong>Passo 3:</strong> Escolha o formato: PDF (layout oficial com logotipo) ou Excel .xlsx.</p>
<p><strong>Passo 4:</strong> O ficheiro e gerado e descarregado automaticamente.</p>
</div>

<h2><span class="section-number">8</span> Sistema & Configuracoes</h2>

<h3>8.1 Configuracoes Gerais</h3>
<div class="step-box">
<p><strong>Nome do Restaurante:</strong> Aparece em todos os documentos (recibos, relatorios, folhas).</p>
<p><strong>NIF:</strong> Numero de identificacao fiscal do restaurante. Obrigatorio para faturacao e AGT.</p>
<p><strong>Endereco:</strong> Aparece nos recibos e relatorios.</p>
<p><strong>Taxa de IVA:</strong> Padrao 7% (taxa simplificada Angola). So altere se houver mudanca legal.</p>
<p><strong>Moeda:</strong> Kwanza (Kz). Padrao para Angola.</p>
</div>

<h3>8.2 Gestao de Utilizadores — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Sistema → Utilizadores.</p>
<p><strong>Passo 2:</strong> Clique em "NOVO UTILIZADOR".</p>
<p><strong>Passo 3:</strong> Preencha:</p>
<ul>
<li><strong>Nome:</strong> Nome completo</li>
<li><strong>Funcao:</strong> Garcom, Caixa, Gerente, Proprietario</li>
<li><strong>PIN:</strong> 4 digitos numericos (ex: 1234)</li>
<li><strong>Permissoes:</strong> Assinale as permissoes necessarias</li>
</ul>
<p><strong>Passo 4:</strong> Clique em "GUARDAR".</p>
</div>
<div class="step-box">
<p><strong>Permissoes disponiveis:</strong></p>
<ul>
<li><strong>POS_SALES:</strong> Acesso ao Terminal POS e vendas. Garcom tem apenas esta.</li>
<li><strong>STOCK_MANAGE:</strong> Menu & Stock, Compras, Inventario.</li>
<li><strong>FINANCE_VIEW:</strong> Dashboard, Financeiro, Relatorios, Analytics.</li>
<li><strong>SYSTEM_CONFIG:</strong> Configuracoes, Gestao de Utilizadores, Supabase. Apenas Proprietario.</li>
</ul>
</div>

<h3>8.3 Supabase & Backup</h3>
<div class="step-box">
<p><strong>Configurar Supabase:</strong></p>
<p><strong>Passo 1:</strong> Aceda a Sistema → Supabase.</p>
<p><strong>Passo 2:</strong> Insira a URL do projeto Supabase.</p>
<p><strong>Passo 3:</strong> Insira a chave anonima (anon key).</p>
<p><strong>Passo 4:</strong> Clique em "TESTAR LIGACAO".</p>
<p><strong>Passo 5:</strong> Se estiver verde, clique em "GUARDAR".</p>
<p><strong>Diagnosticar Supabase:</strong></p>
<p><strong>Passo 1:</strong> Sistema → Supabase → "DIAGNOSTICAR".</p>
<p><strong>Passo 2:</strong> O sistema verifica a conexao e o estado de todas as tabelas.</p>
<p><strong>Passo 3:</strong> Se houver erros, mostra instrucoes para corrigir.</p>
</div>
<div class="danger"><strong>SEGURANCA:</strong> Nunca partilhe a chave do Supabase. Mantenha o PIN de acesso confidencial. So o Proprietario deve ter acesso a SYSTEM_CONFIG.</div>

<h2><span class="section-number">9</span> Impressao & Documentos</h2>

<h3>9.1 Recibos Individuais — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda a Capital Humano → Folha de Salario.</p>
<p><strong>Passo 2:</strong> Clique no icone de <strong>impressora</strong> ao lado do funcionario.</p>
<p><strong>Passo 3:</strong> O recibo abre num modal com:</p>
<ul>
<li>Logotipo da Tasca do Vereda</li>
<li>NIF e endereco do restaurante</li>
<li>Dados do funcionario</li>
<li>Salario base, subsidios, horas extras</li>
<li>INSS, IRT, outros descontos</li>
<li>Valor bruto e liquido</li>
</ul>
<p><strong>Passo 4:</strong> Clique em "IMPRIMIR / PDF" para guardar ou imprimir.</p>
</div>

<h3>9.2 Folha de Pagamento Completa — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Capital Humano → Folha de Salario.</p>
<p><strong>Passo 2:</strong> Clique em "VER FOLHA COMPLETA".</p>
<p><strong>Passo 3:</strong> A folha A4 inclui:</p>
<ul>
<li>Logotipo, NIF e endereco do restaurante</li>
<li>Tabela com todos os funcionarios</li>
<li>Colunas: Nome, Cargo, Salario Base, Subsidios, Horas Extras, Bruto, INSS, IRT, Descontos, Liquido</li>
<li>Totais no final da tabela</li>
</ul>
<p><strong>Passo 4:</strong> Pode imprimir ou guardar como PDF.</p>
</div>

<h2><span class="section-number">10</span> Dicas para Administradores</h2>
<div class="step-box">
<p><strong>Monitorizacao diaria:</strong> Verifique o Dashboard todas as manhas para identificar problemas.</p>
<p><strong>Fecho semanal:</strong> Faca fecho de caixa todas as sextas-feiras e verifique se o dinheiro fisico corresponde.</p>
<p><strong>Inventario semanal:</strong> Conte o stock fisico pelo menos uma vez por semana.</p>
<p><strong>Backup mensal:</strong> Exporte relatorios de vendas e despesas para PDF e guarde num disco externo.</p>
<p><strong>Auditoria fiscal:</strong> Mantenha todos os recibos e faturas organizados por mes para a AGT.</p>
</div>

</div>
</body>
</html>`;

fs.writeFileSync('public/docs/manual-admin.html', manualAdmin, 'utf8');
console.log('✅ Manual administrador atualizado');
" 2>&1
