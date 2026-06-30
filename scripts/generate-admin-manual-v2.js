const fs = require('fs');

const content = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Manual do Administrador - REST IA OS</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.7;padding:40px}
.container{max-width:900px;margin:0 auto}
h1{font-size:2.5rem;font-weight:900;color:#a855f7;margin-bottom:10px;text-transform:uppercase}
.version{font-size:.75rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:40px}
h2{font-size:1.25rem;font-weight:800;color:#a855f7;margin:40px 0 20px;padding-bottom:10px;border-bottom:2px solid rgba(168,85,247,.2);text-transform:uppercase}
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
.example{background:rgba(168,85,247,.05);border-left:3px solid #a855f7;padding:12px 16px;margin:10px 0;border-radius:0 8px 8px 0}
.example strong{color:#a855f7}
table{width:100%;border-collapse:collapse;margin:15px 0;font-size:.875rem;border-radius:12px;overflow:hidden}
th{background:rgba(168,85,247,.12);color:#a855f7;font-weight:700;text-transform:uppercase;font-size:.7rem;letter-spacing:.08em;padding:1rem;text-align:left}
td{padding:.875rem 1rem;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.05)}
tr:hover td{background:rgba(255,255,255,.02)}
</style>
</head>
<body>
<div class="container">
<h1>Manual do Administrador</h1>
<p class="version">REST IA OS v1.0.6 — Tasca do Vereda</p>

<h2>1. Dashboard e Analytics</h2>
<p>O Dashboard e o painel de controlo principal. Mostra a saude financeira em tempo real via Motor SyncCore.</p>

<h3>1.1 Cards Principais</h3>
<div class="step-box">
<p><strong>Rendimento Global:</strong> Faturamento total acumulado desde 01/01. Inclui todas as vendas com status "closed" ou "paid". Se este numero nao aumenta dia apos dia, investigue.</p>
<div class="example"><strong>Exemplo:</strong> Hoje e 15/06 e mostra 2.500.000 Kz. Desde 01/01 ja se faturou este valor.</div>
<p><strong>Faturamento Hoje:</strong> Vendas do dia (00:00 ate agora). Atualiza em tempo real. As 14h mostra 45.000 Kz. Ate 23h deve passar 80.000 Kz para ser bom dia.</div>
<p><strong>Despesas Totais:</strong> Soma de todas as despesas: compras, salarios, aluguer, luz/agua, marketing.</p>
<div class="example"><strong>Exemplo:</strong> 350.000 Kz em despesas este mes. Se acima da media historica, investigue categorias com aumento.</div>
<p><strong>Folha Salarial:</strong> Custo total com funcionarios do mes. Calculo: (Base + Subsidios + Extras) - (INSS + IRT).</p>
<p><strong>Impostos (7%):</strong> IVA estimado sobre faturamento. Taxa simplificada Angola. Faturamento Hoje x 0,07.</p>
<p><strong>Custos Totais:</strong> Despesas + Folha Salarial. Tudo o que a Tasca gastou no periodo.</p>
</div>

<h3>1.2 Graficos - Como Interpretar</h3>
<div class="step-box">
<p><strong>Vendas por Hora:</strong> Eixo X = horas (08h-23h), Eixo Y = valor vendido. Use para identificar picos e ajustar staff. Se nao ha vendas 15h-18h, faca promocoes de lanche.</p>
<div class="example"><strong>Exemplo:</strong> Pico as 20h (25.000 Kz), vale as 15h (2.000 Kz). Reduza staff as 15h, aumente as 20h.</div>
<p><strong>Top Produtos:</strong> Os 10 mais vendidos por quantidade. Se "Mufete de Peixe" e #1, garanta stock de peixe. Se produto do top 5 desaparece, investigue: subiu preco? Qualidade mudou?</p>
<div class="example"><strong>Exemplo:</strong> Top 3: 1) Cerveja Cuca (45 unid), 2) Mufete Peixe (32), 3) Arroz Feijao (28). Compre mais cerveja e peixe.</div>
<p><strong>Vendas por Categoria:</strong> Percentagem Bebidas vs Comida vs Sobremesas. Se bebidas sao 60%, ajuste precos de bebida para maximizar margem. Se sobremesas menos de 5%, treine garcons a oferecer.</p>
</div>
<div class="tip"><strong>DICA:</strong> Deixe o Dashboard aberto num ecra secundario durante o servico. Numeros atualizam automaticamente.</div>

<h2>2. Centro de Lucro</h2>
<p>Monitora saude financeira com inteligencia artificial do Motor SyncCore.</p>

<h3>2.1 Controlo de Margens</h3>
<div class="step-box">
<p><strong>Formula:</strong> Lucro = Receitas - Despesas - Salarios - Impostos</p>
<p>O sistema calcula margem atual (%) e compara com mes anterior e media do ano.</p>
<p><strong>Alertas:</strong> Defina limite minimo em Sistema -> Configuracoes (ex: 25%). Se lucro real descer abaixo, recebe notificacao no Dashboard.</p>
<div class="example"><strong>Exemplo:</strong> Margem hoje 30%, limite 25% = OK. Se cair para 22%, aparece alerta laranja.</div>
</div>

<h3>2.2 Previsoes SyncCore</h3>
<div class="step-box">
<p>Previsoes baseadas em padroes historicos:</p>
<ul>
<li>"Stock de cerveja acaba em 3 dias baseado no consumo medio"</li>
<li>"Sabado esperado: 150 clientes baseado nos ultimos 4 sabados"</li>
<li>"Margem de lucro 15% abaixo do esperado para esta semana"</li>
<li>"Despesa com luz 20% acima da media do mes passado"</li>
<li>"Horario de pico as 20h - recomenda-se +1 garcom"</li>
</ul>
<p>Aparecem como cards de alerta no Centro de Lucro e topo do Dashboard.</p>
</div>

<h2>3. Financeiro Legal</h2>

<h3>3.1 Fluxo de Caixa</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Financeiro -> Fluxo de Caixa.</p>
<p><strong>Passo 2:</strong> Tabela com: Data | Entradas (vendas POS) | Saidas (despesas) | Saldo (Entradas - Saidas).</p>
<p><strong>Passo 3:</strong> Filtros: Hoje / Esta Semana / Este Mes / Este Ano.</p>
<p><strong>Passo 4:</strong> Clique numa data para ver detalhe de todas as transacoes.</p>
<p><strong>Passo 5:</strong> "EXPORTAR" para PDF ou Excel.</p>
</div>
<div class="example"><strong>Exemplo:</strong> 10/06/2026: Entradas 78.000 Kz, Saidas 25.000 Kz (peixe + salario diario), Saldo +53.000 Kz.</div>

<h3>3.2 Despesas - Como Registar</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Financeiro -> Despesas -> "NOVA DESPESA".</p>
<p><strong>Passo 2:</strong> Preencha:</p>
<ul>
<li><strong>Descricao:</strong> Especifico (ex: "Aluguer Tasca Junho 2026", "Compra peixe fresco fornecedor Manuel", "Conta luz ENDE")</li>
<li><strong>Valor:</strong> Em Kwanza (ex: 500.000 Kz)</li>
<li><strong>Data:</strong> Quando ocorreu</li>
<li><strong>Categoria:</strong> Compras (materia-prima), Salarios, Aluguer, Luz/Agua, Marketing, Outros</li>
<li><strong>Anexo:</strong> Foto ou PDF do recibo/fatura. Obrigatorio para auditoria.</li>
</ul>
<p><strong>Passo 3:</strong> Estado: Pendente (ainda nao pago), Pago (ja pago), Cancelado (erro).</p>
<p><strong>Passo 4:</strong> "GUARDAR DESPESA".</p>
</div>
<div class="warning"><strong>ATENCAO:</strong> Sempre anexe recibo ou fatura. A AGT pode pedir comprovativo durante auditoria fiscal.</div>

<h3>3.3 AGT - Controlo Fiscal Angola</h3>
<div class="step-box">
<p><strong>Registo de NIFs:</strong> No POS, antes de fechar conta, ha campo "NIF do Cliente". Insira NIF (9 digitos) se cliente pedir fatura com IVA. Aparece no recibo e no relatorio mensal.</p>
<div class="example"><strong>Exemplo:</strong> Empresa faz jantar 50.000 Kz e pede fatura. No POS, NIF 123456789. Recibo: "NIF: 123456789 | IVA 7%: 3.500 Kz".</div>
<p><strong>Exportar SAF-T:</strong></p>
<p>Passo 1: Financeiro -> AGT. Passo 2: Selecione periodo (mes/ano). Passo 3: "EXPORTAR SAF-T". Passo 4: Gera XML formato OGA 2024. Passo 5: Submeta no portal AGT (www.agt.minfin.gov.ao).</p>
<p><strong>Relatorio IVA Mensal:</strong></p>
<p>Passo 1: Financeiro -> AGT -> "RELATORIO DE IVA". Passo 2: Selecione mes. Passo 3: Sistema calcula IVA liquidado (Faturamento x 7%). Passo 4: Mostra faturamento total, IVA cobrado, IVA dedutivel, IVA a pagar. Passo 5: Exporte PDF para arquivo e entrega.</p>
</div>
<div class="warning"><strong>OBRIGATORIO:</strong> Taxa IVA simplificada Angola = 7%. Declare e pague ate dia 15 de cada mes (referente ao mes anterior). Atraso gera multas.</div>

<h2>4. Menu e Stock</h2>

<h3>4.1 Adicionar Produto</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Menu & Stock -> Produtos -> "NOVO PRODUTO".</p>
<p><strong>Passo 2:</strong> Preencha:</p>
<ul>
<li><strong>Nome:</strong> Comercial (ex: "Mufete de Peixe Grelhado", "Cerveja Cuca 330ml")</li>
<li><strong>Descricao:</strong> Ingredientes (ex: "Peixe grelhado com batata, feijao-guinga, farinha, cebola e piri-piri")</li>
<li><strong>Preco venda:</strong> Cliente paga (ex: 5.000 Kz)</li>
<li><strong>Custo producao:</strong> Ingredientes + embalagem (ex: 2.000 Kz)
<div class="example"><strong>Calculo custo:</strong> Peixe 800 + Batata 300 + Feijao 200 + Farinha 150 + Gas 100 + Embalagem 50 + Desperdicio 400 = 2.000 Kz</div>
</li>
<li><strong>Categoria:</strong> Entradas, Pratos Principais, Bebidas, Sobremesas</li>
<li><strong>Imagem:</strong> Foto real do prato (aparece no menu digital)</li>
</ul>
<p><strong>Passo 3:</strong> Sistema calcula margem automaticamente:</p>
<p style="font-family:monospace;background:rgba(255,255,255,.05);padding:10px;border-radius:8px">Margem (Kz) = Preco - Custo = 5.000 - 2.000 = 3.000 Kz<br>Margem (%) = (Preco - Custo) / Preco x 100 = 60%</p>
<p><strong>Passo 4:</strong> Defina stock inicial (ex: 50) e stock minimo (ex: 10). Alerta quando atingir 10.</p>
<p><strong>Passo 5:</strong> "Activo" para aparecer no POS. "Inactivo" esconde.</p>
<p><strong>Passo 6:</strong> "GUARDAR PRODUTO".</p>
</div>
<div class="tip"><strong>DICA:</strong> Produtos com margem negativa (custo > preco) aparecem em <strong>vermelho</strong>. Ajuste imediatamente preco ou reduza custo.</div>

<h3>4.2 Inventario Fisico</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Menu & Stock -> Inventario.</p>
<p><strong>Passo 2:</strong> Sistema mostra lista com stock registado.</p>
<p><strong>Passo 3:</strong> Para cada produto, va fisicamente a prateleira e conte:</p>
<ul>
<li>Cerveja Cuca: sistema diz 15, prateleira tem 12 -> diferenca 3</li>
<li>Mufete: sistema 20 preparacoes, ingredientes reais permitem 18 -> diferenca 2</li>
</ul>
<p><strong>Passo 4:</strong> Insira stock real no sistema.</p>
<p><strong>Passo 5:</strong> Se houver diferenca, indique motivo: Venda nao registada / Quebra ou Perda / Erro de entrada / Outro.</p>
<p><strong>Passo 6:</strong> "AJUSTAR STOCK". Sistema atualiza e regista ajuste para auditoria.</p>
</div>
<div class="warning"><strong>IMPORTANTE:</strong> Faca inventario <strong>pelo menos uma vez por semana</strong> (recomendado: toda segunda-feira de manha). Se nao contar, stock fica desactualizado.</div>

<h2>5. Compras e Aprovacoes</h2>

<h3>5.1 Fluxo de Aprovacao</h3>
<div class="step-box">
<p><strong>Passo 1 (Funcionario):</strong> Nota falta de material. Compras -> "NOVO PEDIDO". Descreve material, quantidade, preco estimado, fornecedor sugerido.</p>
<div class="example"><strong>Exemplo:</strong> Cozinheiro Jose ve que so restam 2 caixas cerveja. Cria pedido: "Cerveja Cuca 330ml, 10 caixas, 50.000 Kz, Fornecedor: Distribuidora Cuca".</div>
<p><strong>Passo 2:</strong> Sistema envia notificacao ao Admin e Owner.</p>
<p><strong>Passo 3 (Admin):</strong> Analisa: preco correto? Fornecedor confiavel? Ha alternativa?</p>
<p><strong>Passo 4 (Admin):</strong> Decide: Aprovar / Rejeitar / Pedir mais informacoes.</p>
<p><strong>Passo 5 (Owner remoto):</strong> Pode aprovar via Owner Hub em https://rest-ia.vercel.app/owner.</p>
<div class="example"><strong>Exemplo:</strong> Owner em Luanda recebe notificacao no telemovel. Abre Owner Hub, ve pedido 50.000 Kz, clica "APROVAR". Admin na Tasca recebe confirmacao imediata.</div>
<p><strong>Passo 6:</strong> Apos aprovacao, estado muda para "Aprovado".</p>
<p><strong>Passo 7:</strong> Compra executada e entrada de stock registada automaticamente.</p>
</div>

<h3>5.2 Cadastro de Fornecedores</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Compras -> Fornecedores -> "NOVO FORNECEDOR".</p>
<p><strong>Passo 2:</strong> Preencha: Nome (ex: "Distribuidora Cuca Lda."), NIF (9 digitos), Telefone, Email, Endereco.</p>
<p><strong>Passo 3:</strong> Guarde. Sistema mostra historico de compras e total gasto por fornecedor.</p>
</div>
<div class="tip"><strong>DICA:</strong> Use historico para negociar precos. "No ano passado compramos 120 caixas a 4.500 Kz. Este ano propomos 4.200 Kz por volume."</div>

<h2>6. Capital Humano</h2>

<h3>6.1 Adicionar Funcionario</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Capital Humano -> Funcionarios -> "ADICIONAR FUNCIONARIO".</p>
<p><strong>Passo 2:</strong> Preencha:</p>
<ul>
<li><strong>Nome completo:</strong> Nome real (ex: "Joao Manuel Silva")</li>
<li><strong>Cargo:</strong> Garcom, Cozinheiro, Auxiliar Cozinha, Gerente, Administrativo, Outro</li>
<li><strong>NIF:</strong> 9 digitos (ex: 123456789). Verifique com BI.</li>
<li><strong>Salario base:</strong> Mensal bruto em Kwanza
<div class="example"><strong>Exemplos:</strong> Garcom 6 meses experiencia: 120.000 Kz. Cozinheiro chefe: 250.000 Kz. Gerente: 300.000 Kz.</div>
</li>
<li><strong>Tipo contrato:</strong> Indeterminado (sem fim) / Determinado (com prazo) / Servico (pontual)</li>
<li><strong>Subsidios:</strong> Alimentacao (ex: 15.000 Kz/mes), Transporte (ex: 10.000 Kz/mes), Bonus (se houver)</li>
</ul>
<p><strong>Passo 3:</strong> Isencao IRT: assinale <strong>APENAS</strong> se funcionario tiver deficiencia reconhecida ou for combatente da liberdade da patria.</p>
<p><strong>Passo 4:</strong> "GUARDAR FUNCIONARIO".</p>
</div>

<h3>6.2 Processar Folha Salarial</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Capital Humano -> Folha -> "INICIAR PROCESSAMENTO DO MES" (ex: Junho 2026).</p>
<p><strong>Passo 2:</strong> Sistema carrega todos funcionarios activos com salarios e subsidios.</p>
<p><strong>Passo 3:</strong> Para cada funcionario, adicione ajustes:</p>
<ul>
<li><strong>Horas Extras:</strong> Valor positivo (ex: +20.000 Kz). So se houver.</li>
<li><strong>Outros Descontos:</strong> Valor negativo (ex: -5.000 Kz). So se houver.</li>
</ul>
<p><strong>Passo 4:</strong> Sistema calcula AUTOMATICAMENTE:</p>
<ul>
<li><strong>BRUTO</strong> = Salario Base + Subsidios + Horas Extras</li>
<li><strong>INSS (3%)</strong> = 3% do (Salario Base + Bonus)</li>
<li><strong>IRT</strong> = consulta tabela progressiva OGE 2024 (ver tabela abaixo)</li>
<li><strong>LIQUIDO</strong> = Bruto - INSS - IRT - Outros Descontos</li>
</ul>
<p><strong>Passo 5:</strong> Verifique valores de cada funcionario.</p>
<p><strong>Passo 6:</strong> "FECHAR E PROCESSAR FOLHA".</p>
<p><strong>Passo 7:</strong> Gravado no Supabase com recibo: RV-AAAA-MM-NNN (ex: RV-2026-06-001).</p>
<p><strong>Passo 8:</strong> Imprima recibos individuais ou folha completa A4.</p>
</div>
<div class="danger"><strong>SEGURANCA:</strong> Depois de fechada, a folha NAO pode ser alterada. Verifique TUDO antes de confirmar.</div>

<h3>6.3 Tabela IRT - OGE 2024</h3>
<table>
<tr><th>Escalao</th><th>Base de Calculo</th><th>Taxa</th></tr>
<tr><td>1</td><td>Ate 70.000 Kz</td><td>10%</td></tr>
<tr><td>2</td><td>70.001 - 100.000 Kz</td><td>13%</td></tr>
<tr><td>3</td><td>100.001 - 150.000 Kz</td><td>16%</td></tr>
<tr><td>4</td><td>150.001 - 200.000 Kz</td><td>18,5%</td></tr>
<tr><td>5</td><td>200.001 - 300.000 Kz</td><td>19%</td></tr>
<tr><td>6</td><td>300.001 - 500.000 Kz</td><td>20%</td></tr>
<tr><td>7</td><td>Acima de 500.000 Kz</td><td>21%</td></tr>
<tr><td colspan="3">Salarios ate 100.000 Kz sao isentos de IRT</td></tr>
</table>
<div class="tip"><strong>NOTA:</strong> Folha e arquivada no Supabase com recibo sequencial e hash de validacao.</div>

<h3>6.4 INSS - Seguranca Social</h3>
<div class="step-box">
<p><strong>Trabalhador paga 3%</strong> sobre (Salario Base + Bonus).</p>
<p><strong>Empregador paga 8%</strong> sobre mesma base.</p>
<p>Exemplo: Funcionario com salario 150.000 Kz + bonus 10.000 Kz = 160.000 Kz base.</p>
<p>INSS Trabalhador = 160.000 x 3% = 4.800 Kz (descontado na folha).</p>
<p>INSS Empregador = 160.000 x 8% = 12.800 Kz (pago pela Tasca a Seguranca Social).</p>
<p>Total INSS = 17.600 Kz. Pago mensalmente a Seguranca Social.</p>
</div>

<h2>7. Relatorios</h2>

<h3>7.1 Tipos de Relatorios</h3>
<div class="step-box">
<p><strong>Vendas por Periodo:</strong> Filtre dia/semana/mes/ano. Mostra total, transacoes, ticket medio. Use para identificar tendencias sazonais. Exporte Excel.</p>
<p><strong>Vendas por Funcionario:</strong> Quanto cada um vendeu no POS. Use para comissoes e avaliacao de performance.</p>
<p><strong>Vendas por Produto:</strong> Ordenado por quantidade vendida. Use para ajustar stock e precos.</p>
<p><strong>Movimentacao de Stock:</strong> Entradas (compras) e saidas (vendas). Use para rastrear discrepancias.</p>
<p><strong>Fluxo de Caixa:</strong> Entradas, saidas, saldo por dia. Use para reconciliacao bancaria.</p>
<p><strong>Folha Salarial:</strong> Resumo mensal com INSS, IRT, liquidos por funcionario.</p>
<p><strong>Despesas:</strong> Agrupadas por categoria e fornecedor. Use para controlo orcamental.</p>
</div>

<h3>7.2 Exportar Relatorios</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Abra o relatorio desejado.</p>
<p><strong>Passo 2:</strong> Clique "EXPORTAR" (canto superior direito).</p>
<p><strong>Passo 3:</strong> Escolha: PDF (layout oficial com logotipo Tasca do Vereda) ou Excel .xlsx.</p>
<p><strong>Passo 4:</strong> Ficheiro e gerado e descarregado automaticamente.</p>
</div>

<h2>8. Sistema e Configuracoes</h2>

<h3>8.1 Configuracoes Gerais</h3>
<div class="step-box">
<p><strong>Nome do Restaurante:</strong> "Tasca do Vereda". Aparece em todos os documentos.</p>
<p><strong>NIF:</strong> Numero fiscal do restaurante. Obrigatorio para faturacao e AGT.</p>
<p><strong>Endereco:</strong> Aparece nos recibos e relatorios.</p>
<p><strong>Taxa IVA:</strong> Padrao 7% (Angola). So altere se houver mudanca legal.</p>
<p><strong>Moeda:</strong> Kwanza (Kz).</p>
</div>

<h3>8.2 Gestao de Utilizadores</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Sistema -> Utilizadores -> "NOVO UTILIZADOR".</p>
<p><strong>Passo 2:</strong> Preencha: Nome, Funcao (Garcom/Caixa/Gerente/Proprietario), PIN (4 digitos).</p>
<p><strong>Passo 3:</strong> Permissoes:</p>
<ul>
<li>POS_SALES - Garcom (apenas vendas)</li>
<li>STOCK_MANAGE - Menu & Stock, Compras</li>
<li>FINANCE_VIEW - Dashboard, Financeiro, Relatorios</li>
<li>SYSTEM_CONFIG - Proprietario apenas</li>
</ul>
<p><strong>Passo 4:</strong> Guarde.</p>
</div>

<h3>8.3 Supabase - Backup na Nuvem</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Sistema -> Supabase.</p>
<p><strong>Passo 2:</strong> Insira URL do projeto e chave anonima.</p>
<p><strong>Passo 3:</strong> "TESTAR LIGACAO" -> verde = OK.</p>
<p><strong>Passo 4:</strong> "GUARDAR".</p>
<p><strong>Diagnosticar:</strong> Sistema -> Supabase -> "DIAGNOSTICAR". Verifica conexao e estado das tabelas.</p>
</div>
<div class="danger"><strong>SEGURANCA:</strong> Nunca partilhe a chave do Supabase. PIN e confidencial. So Proprietario tem SYSTEM_CONFIG.</div>

<h2>9. Impressao e Documentos</h2>

<h3>9.1 Recibo Individual</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Capital Humano -> Folha.</p>
<p><strong>Passo 2:</strong> Clique icone impressora ao lado do funcionario.</p>
<p><strong>Passo 3:</strong> Modal mostra: logotipo Tasca do Vereda, NIF, endereco, dados do funcionario, salario, subsidios, INSS, IRT, liquido.</p>
<p><strong>Passo 4:</strong> "IMPRIMIR / PDF".</p>
</div>

<h3>9.2 Folha Completa A4</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Capital Humano -> Folha -> "VER FOLHA COMPLETA".</p>
<p><strong>Passo 2:</strong> A4 com: logotipo, NIF, endereco, tabela todos funcionarios, totais.</p>
<p><strong>Passo 3:</strong> Imprima ou guarde PDF.</p>
</div>

<h2>10. Dicas para Administradores</h2>
<div class="step-box">
<p><strong>Diaria:</strong> Verifique Dashboard todas as manhas. Compare Faturamento Hoje com media do mesmo dia da semana.</p>
<p><strong>Semanal:</strong> Faca fecho de caixa sexta-feira. Verifique dinheiro fisico vs sistema. Faca inventario segunda-feira de manha.</p>
<p><strong>Mensal:</strong> Exporte relatorios de vendas e despesas para PDF. Guarde em disco externo. Processe folha salarial ate dia 25.</p>
<p><strong>Fiscal:</strong> Declare IVA ate dia 15 do mes seguinte. Guarde todos os recibos organizados por mes para AGT.</p>
<p><strong>Seguranca:</strong> Faca backup da chave Supabase num local seguro. Altere PINs se funcionario sair.</p>
<p><strong>Staff:</strong> Treine garcons a usar observacoes no POS. Treine a oferecer sobremesas (aumenta ticket medio).</p>
</div>

</div>
</body>
</html>`;

fs.writeFileSync('public/docs/manual-admin.html', content, 'utf8');
console.log('Manual admin atualizado');
