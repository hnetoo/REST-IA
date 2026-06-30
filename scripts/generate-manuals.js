const fs = require('fs');

const manualUser = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>Manual Utilizador</title>
<style>
body{font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.7;padding:40px}
.container{max-width:900px;margin:0 auto}
h1{font-size:2.5rem;font-weight:900;color:#f97316;margin-bottom:10px;text-transform:uppercase}
.version{font-size:.75rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:40px}
h2{font-size:1.25rem;font-weight:800;color:#f97316;margin:40px 0 20px;padding-bottom:10px;border-bottom:2px solid rgba(249,115,22,.2);text-transform:uppercase;letter-spacing:.05em}
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
.step-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 20px;margin:12px 0}
.step-box p{margin-bottom:8px}
.step-box p:last-child{margin-bottom:0}
</style></head>
<body>
<div class="container">
<h1>Manual do Utilizador</h1>
<p class="version">REST IA OS v1.0.6 — Tasca do Vereda</p>

<h2><span class="section-number">1</span> Terminal POS — Vendas</h2>
<p>O Terminal POS e o coracao das operacoes diarias. E aqui que se registam todos os pedidos, se gerem as mesas e se processam os pagamentos.</p>

<h3>1.1 Abrir uma Mesa — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> No ecra principal do POS, clique no botao grande <strong>"NOVA MESA"</strong>.</p>
<p><strong>Passo 2:</strong> Aparece uma lista com os numeros das mesas disponiveis. Selecione o numero (ex: Mesa 5).</p>
<p><strong>Passo 3:</strong> Escolha o tipo de consumo:</p>
<ul><li><strong>LOCAL</strong> — Cliente come no restaurante. A mesa fica associada ao pedido.</li><li><strong>ENTREGA</strong> — Pedido para levar. E necessario preencher os dados do cliente.</li></ul>
<p><strong>Passo 4:</strong> Se escolheu ENTREGA, preencha o <strong>nome do cliente</strong> e o <strong>telefone</strong> (ex: +244 923 456 789).</p>
<p><strong>Passo 5:</strong> Clique em <strong>"CONFIRMAR"</strong>. O POS mostra a mesa aberta.</p>
</div>
<div class="tip"><strong>DICA:</strong> Se o cliente ja esta registado, pode procurar pelo nome ou telefone.</div>

<h3>1.2 Adicionar Itens ao Pedido — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Com a mesa aberta, veja as categorias no topo: <strong>Entradas, Pratos Principais, Bebidas, Sobremesas</strong>.</p>
<p><strong>Passo 2:</strong> Clique na categoria desejada.</p>
<p><strong>Passo 3:</strong> Clique no produto que o cliente pediu. O item e adicionado automaticamente a lista do pedido.</p>
<p><strong>Passo 4:</strong> Use <strong>"+"</strong> e <strong>"−"</strong> para alterar quantidade.</p>
<p><strong>Passo 5:</strong> Clique no <strong>lapis</strong> para observacoes (ex: "sem cebola", "bem passado").</p>
<p><strong>Passo 6:</strong> Continue a adicionar itens ate o pedido estar completo.</p>
</div>
<div class="tip"><strong>DICA:</strong> Pode remover um item clicando no icone de <strong>lixeira</strong>. Cuidado — nao pode ser desfeito!</div>

<h3>1.3 Enviar Pedido para Cozinha — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Revise todos os itens no pedido.</p>
<p><strong>Passo 2:</strong> Clique no botao verde <strong>"ENVIAR PEDIDO"</strong>.</p>
<p><strong>Passo 3:</strong> Confirme o envio. O pedido aparece no <strong>Monitor de Cozinha</strong>.</p>
<p><strong>Passo 4:</strong> A cozinha prepara o pedido. Pode adicionar mais itens a qualquer momento.</p>
</div>

<h3>1.4 Fechar Conta / Processar Pagamento — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Clique em <strong>"FECHAR CONTA"</strong>.</p>
<p><strong>Passo 2:</strong> O ecra mostra o <strong>resumo completo</strong>: itens, quantidades, precos e TOTAL GERAL.</p>
<p><strong>Passo 3:</strong> Selecione o <strong>metodo de pagamento</strong>:</p>
<ul>
<li><strong>Numerario</strong> — Dinheiro em especie. O sistema calcula o troco.</li>
<li><strong>Multicaixa</strong> — Pagamento por cartao via terminal POS.</li>
<li><strong>TPA</strong> — Pagamento por referencia TPA.</li>
<li><strong>Transferencia</strong> — Transferencia bancaria. Anote o comprovativo.</li>
<li><strong>Divida</strong> — O cliente fica a dever. O pedido fica pendente.</li>
</ul>
<p><strong>Passo 4:</strong> Confirme o pagamento.</p>
<p><strong>Passo 5:</strong> O recibo pode ser impresso automaticamente.</p>
<p><strong>Passo 6:</strong> A mesa fica com estado <strong>"Fechada"</strong>.</p>
</div>
<div class="warning"><strong>ATENCAO:</strong> Pedidos em <strong>DIVIDA</strong> ficam pendentes. O cliente deve liquidar antes do <strong>fecho do dia</strong>.</div>

<h3>1.5 Fecho de Caixa Diario</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> No final do dia, aceda ao menu <strong>"Fecho de Caixa"</strong> no Terminal POS.</p>
<p><strong>Passo 2:</strong> O sistema mostra: total de vendas, numero de transacoes, breakdown por metodo de pagamento.</p>
<p><strong>Passo 3:</strong> Verifique se o dinheiro em caixa corresponde ao valor registado.</p>
<p><strong>Passo 4:</strong> Confirme o fecho. O relatorio e guardado.</p>
</div>

<h2><span class="section-number">2</span> Mapa de Sala</h2>
<p>O Mapa de Sala e a representacao visual do restaurante.</p>

<h3>2.1 Entender as Cores das Mesas</h3>
<div class="step-box">
<ul>
<li><strong style="color: #22c55e;">Verde</strong> — Mesa livre. Pronta para receber clientes.</li>
<li><strong style="color: #f97316;">Laranja</strong> — Mesa ocupada com pedido aberto.</li>
<li><strong style="color: #ef4444;">Vermelho</strong> — Mesa com divida pendente.</li>
<li><strong style="color: #3b82f6;">Azul</strong> — Mesa com reserva marcada.</li>
</ul>
</div>

<h3>2.2 Interagir com as Mesas — Passo a Passo</h3>
<div class="step-box">
<p><strong>Abrir POS a partir do Mapa:</strong></p>
<p><strong>Passo 1:</strong> Clique numa mesa <strong>verde</strong> (livre).</p>
<p><strong>Passo 2:</strong> O Terminal POS abre automaticamente com essa mesa ja selecionada.</p>
<p><strong>Ver pedido de uma mesa ocupada:</strong></p>
<p><strong>Passo 1:</strong> Clique numa mesa <strong>laranja</strong>.</p>
<p><strong>Passo 2:</strong> O POS abre com o pedido atual dessa mesa.</p>
<p><strong>Reorganizar o layout:</strong></p>
<p><strong>Passo 1:</strong> Clique e <strong>segure</strong> numa mesa.</p>
<p><strong>Passo 2:</strong> Arraste para a nova posicao.</p>
<p><strong>Passo 3:</strong> Solte para fixar. O layout e guardado automaticamente.</p>
</div>
<div class="tip"><strong>DICA:</strong> Clique direito numa mesa para ver o historico de pedidos.</div>

<h2><span class="section-number">3</span> Reservas</h2>
<p>O sistema de reservas permite gerir marcacoes de clientes.</p>

<h3>3.1 Criar Nova Reserva — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda ao menu <strong>"Reservas"</strong>.</p>
<p><strong>Passo 2:</strong> Clique em <strong>"NOVA RESERVA"</strong>.</p>
<p><strong>Passo 3:</strong> Preencha o formulario:</p>
<ul>
<li><strong>Nome do cliente:</strong> Nome completo.</li>
<li><strong>Telefone:</strong> Numero de contacto (ex: +244 923 456 789).</li>
<li><strong>Data:</strong> Selecione no calendario.</li>
<li><strong>Hora:</strong> Hora de chegada (ex: 19:30).</li>
<li><strong>Numero de pessoas:</strong> Quantidade de convidados.</li>
<li><strong>Mesa preferida:</strong> Selecione uma mesa (opcional).</li>
</ul>
<p><strong>Passo 4:</strong> Em <strong>"Observacoes"</strong> adicione detalhes: "Aniversario — bolo surpresa", "Mesa perto da janela", etc.</p>
<p><strong>Passo 5:</strong> Clique em <strong>"GUARDAR RESERVA"</strong>.</p>
</div>

<h3>3.2 Gerir Reservas Existentes</h3>
<div class="step-box">
<p><strong>Editar reserva:</strong></p>
<p><strong>Passo 1:</strong> Na lista, encontre a reserva.</p>
<p><strong>Passo 2:</strong> Clique no <strong>lapis</strong>.</p>
<p><strong>Passo 3:</strong> Altere os campos necessarios.</p>
<p><strong>Passo 4:</strong> Guarde as alteracoes.</p>
<p><strong>Cancelar reserva:</strong></p>
<p><strong>Passo 1:</strong> Encontre a reserva.</p>
<p><strong>Passo 2:</strong> Clique no <strong>X</strong> ou "Cancelar".</p>
<p><strong>Passo 3:</strong> Confirme. A reserva vai para o <strong>historico</strong>.</p>
</div>
<div class="warning"><strong>IMPORTANTE:</strong> So pode editar/cancelar ate <strong>2 horas antes</strong> do horario marcado.</div>

<h2><span class="section-number">4</span> Eventos</h2>
<p>O modulo de Eventos permite planear casamentos, aniversarios, jantares de grupo.</p>

<h3>4.1 Registar um Evento — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda ao menu <strong>"Eventos"</strong>.</p>
<p><strong>Passo 2:</strong> Clique em <strong>"NOVO EVENTO"</strong>.</p>
<p><strong>Passo 3:</strong> Preencha:</p>
<ul>
<li><strong>Tipo:</strong> Casamento, Aniversario, Jantar de Grupo, Outro.</li>
<li><strong>Nome do cliente:</strong> Identificacao principal.</li>
<li><strong>Data e hora:</strong> Quando o evento realiza-se.</li>
<li><strong>Numero de convidados:</strong> Pessoas esperadas.</li>
<li><strong>Menu especial:</strong> Descreva o menu acordado.</li>
<li><strong>Preco por pessoa:</strong> Valor acordado.</li>
</ul>
<p><strong>Passo 4:</strong> O sistema calcula automaticamente:</p>
<ul>
<li><strong>Receita estimada:</strong> Convidados × Preco por pessoa.</li>
<li><strong>Custo estimado:</strong> Baseado nos ingredientes.</li>
<li><strong>Lucro estimado:</strong> Receita − Custos.</li>
</ul>
<p><strong>Passo 5:</strong> Guarde o evento.</p>
</div>
<div class="tip"><strong>DICA:</strong> Use "Observacoes" para anotar requisitos: decoracao, musica, bolo, bebidas incluidas.</div>

<h2><span class="section-number">5</span> Compras — Pedido de Material</h2>
<p>Quando o stock acaba ou e necessario algo novo, crie um pedido de compra.</p>

<h3>5.1 Criar Pedido de Compra — Passo a Passo</h3>
<div class="step-box">
<p><strong>Passo 1:</strong> Aceda ao menu <strong>"Compras"</strong>.</p>
<p><strong>Passo 2:</strong> Clique em <strong>"NOVO PEDIDO"</strong>.</p>
<p><strong>Passo 3:</strong> Preencha o formulario:</p>
<ul>
<li><strong>Descricao do material:</strong> Seja especifico (ex: "Caixa de cerveja Cuca 330ml", "Pacote de guardanapos")</li>
<li><strong>Quantidade:</strong> Quantas unidades precisa.</li>
<li><strong>Preco estimado:</strong> Valor aproximado total.</li>
<li><strong>Fornecedor sugerido:</strong> De quem costuma comprar (opcional).</li>
</ul>
<p><strong>Passo 4:</strong> Clique em <strong>"ENVIAR PEDIDO"</strong>.</p>
<p><strong>Passo 5:</strong> O pedido e enviado para aprovacao do Administrador/Owner.</p>
</div>
<div class="tip"><strong>DICA:</strong> Sempre que possivel, anexe foto ou fatura do fornecedor ao pedido.</div>

<h2><span class="section-number">6</span> Dicas Gerais</h2>
<div class="step-box">
<p><strong>Login:</strong> Use o seu PIN de 4 digitos. Nunca o partilhe.</p>
<p><strong>Offline:</strong> A app funciona sem internet! Os dados guardam-se localmente e sincronizam depois.</p>
<p><strong>Backup:</strong> Tudo e guardado automaticamente na nuvem (Supabase).</p>
<p><strong>Ajuda:</strong> Use o Assistente Virtual (botao no canto inferior direito) para perguntas rapidas.</p>
</div>

</div>
</body>
</html>`;

fs.writeFileSync('public/docs/manual-utilizador.html', manualUser, 'utf8');
console.log('✅ Manual utilizador atualizado');
