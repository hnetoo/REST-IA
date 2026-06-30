// Conhecimento completo do Assistente Virtual REST IA OS
export interface BotResponse {
  keywords: string[];
  response: string;
}

export const botKnowledge: BotResponse[] = [
  // ==================== POS ====================
  {
    keywords: ['pos', 'terminal', 'venda', 'vender'],
    response: 'O Terminal POS é o coração das vendas. Aqui pode:\n1) Abrir mesas (Local ou Entrega)\n2) Adicionar itens por categoria (Entradas, Pratos, Bebidas, Sobremesas)\n3) Ajustar quantidades e adicionar observações\n4) Enviar pedido para cozinha\n5) Fechar conta com pagamento\n\n💡 Pergunte-me: "como abrir mesa", "como pagar", "enviar cozinha"'
  },
  {
    keywords: ['mesa', 'abrir mesa', 'nova mesa'],
    response: 'Para abrir mesa: 1) Clique "NOVA MESA", 2) Selecione o número, 3) Escolha LOCAL ou ENTREGA, 4) Se ENTREGA, preencha nome e telefone, 5) Confirme. A mesa fica aberta e pronta para itens.'
  },
  {
    keywords: ['pagamento', 'pagar', 'fechar conta', 'dinheiro', 'cartao'],
    response: 'PASSO A PASSO — Processar Pagamento:\n1) Clique em "FECHAR CONTA" no POS.\n2) O ecrã mostra RESUMO: itens, quantidades, preços, TOTAL GERAL.\n3) Selecione MÉTODO:\n   • NUMERÁRIO — digite valor recebido, sistema calcula TROCO\n   • MULTICAIXA — passe cartão no terminal POS\n   • TPA — use referência de pagamento\n   • TRANSFERÊNCIA — anote comprovativo\n   • DÍVIDA — cliente fica a dever (só com autorização)\n4) Verifique valor.\n5) Clique "CONFIRMAR PAGAMENTO".\n6) Recibo imprime automaticamente (se houver impressora).\n7) Mesa passa a "Fechada".\n⚠️ DÍVIDA: deve ser liquidada antes do fecho do dia.'
  },
  {
    keywords: ['sub-conta', 'subconta', 'dividir conta', 'dividir'],
    response: 'Para dividir a conta de uma mesa:\n1) Abra a mesa que quer dividir.\n2) Clique no botão "SUB-CONTA" ou "DIVIDIR".\n3) Mova itens entre a conta principal e a sub-conta.\n4) Cada sub-conta pode ser paga separadamente com método diferente.'
  },
  {
    keywords: ['monitor cliente', 'customer display', 'segundo ecra', '2 ecrã'],
    response: 'Para mostrar o total ao cliente num segundo monitor:\n1) Clique no ícone de Monitor no POS.\n2) O sistema abre uma janela no segundo ecrã (se disponível).\n3) O cliente vê os itens e o total em tempo real.\n💡 Funciona com Screen Details API do Chrome ou posiciona automaticamente no 2º monitor.'
  },
  {
    keywords: ['turno', 'abrir turno', 'fechar turno'],
    response: 'Turnos (Manhã e Tarde):\n\n1️⃣ ABERTURA: Clique "TURNO" no POS → escolha MANHÃ ou TARDE → insira valor em caixa (troco).\n2️⃣ DURANTE: Todas as vendas ficam associadas ao turno automaticamente.\n3️⃣ FECHO: Clique "TURNO" → veja resumo (vendas por modalidade, produtos vendidos) → conte dinheiro → insira valor contado → o sistema calcula diferença → clique "FECHAR TURNO".\n\n📄 O relatório inclui: operador, abertura, vendas por modalidade, produtos vendidos com quantidades, e resumo (esperado vs contado).\n\n⚠️ Só pode fazer Fecho do Dia quando AMBOS os turnos estiverem fechados.'
  },
  {
    keywords: ['fecho', 'fecho do dia', 'fechar dia', 'fecho de caixa'],
    response: 'Fecho do Dia (final do dia operacional):\n\n1️⃣ PRÉ-REQUISITO: Ambos os turnos (Manhã e Tarde) devem estar FECHADOS.\n2️⃣ NO POS: Clique "Fecho do Dia" (visível para Gerente/Admin).\n3️⃣ MODAL: Veja resumo geral + Turno da Manhã + Turno da Tarde + Vendas por Modalidade + Produtos Vendidos.\n4️⃣ PREVIEW: Clique "Ver Relatório" para ver o relatório completo.\n5️⃣ CONFIRME: Clique "Confirmar Fecho do Dia" → guardado no cash_flow (Supabase).\n\n⚠️ Verifique sempre os valores antes de confirmar. O Fecho do Dia só pode ser feito uma vez por dia.'
  },
  {
    keywords: ['fecho automatico', 'auto fecho', 'fecho auto', 'fecho retroativo'],
    response: '🤖 Fecho Automático de Caixa:\n\nO sistema faz fecho automático em duas situações:\n\n1️⃣ FECHO DAS 04:55: Entre 04:55 e 04:59 (hora Luanda), se o dia não tem fecho, o sistema cria automaticamente com a soma das vendas. Funciona em qualquer página aberta (POS, Dashboard, Owner Dashboard).\n\n2️⃣ FECHO RETROATIVO: Se ninguém teve a app aberta às 04:55, quando o Owner Dashboard abre depois das 05:00 e o dia anterior não tem fecho, o sistema cria automaticamente.\n\n⚠️ O fecho automático é uma rede de segurança. Faça sempre o fecho manual para conferir os valores.'
  },
  {
    keywords: ['enviar cozinha', 'cozinha', 'pedido cozinha'],
    response: 'Para enviar: 1) Revise itens no pedido, 2) Clique botão verde "ENVIAR PEDIDO", 3) Confirme. O pedido aparece no Monitor de Cozinha. Pode adicionar mais itens depois e enviar novamente.'
  },
  {
    keywords: ['observacao', 'nota', 'sem cebola'],
    response: 'Para observação: Clique no lápis ao lado do item → Escreva (ex: "sem cebola", "bem passado") → Confirme. Aparece no Monitor de Cozinha junto com o item.'
  },
  {
    keywords: ['delivery', 'entrega', 'takeaway', 'para levar'],
    response: 'Para delivery: 1) Abra mesa como ENTREGA, 2) Preencha nome e telefone (obrigatório), 3) Adicione itens normalmente, 4) Feche conta e processe pagamento.'
  },

  // ==================== DASHBOARD V2 & BI ====================
  {
    keywords: ['dashboard', 'painel', 'ecra principal'],
    response: 'O Dashboard V2 mostra métricas em tempo real:\n\n📊 CARDS:\n• Rendimento Global — faturamento desde início do ano\n• Faturação Hoje — atualiza automaticamente\n• Despesas Totais\n• Folha Salarial\n• Impostos 7%\n• Custos Totais\n\n📈 BI CHARTS:\n• Receita vs Custos vs Break-Even (BarChart semanal)\n• Receita por Categoria (BarChart horizontal)\n• Receita Semanal (LineChart)\n\n💡 Pergunte-me: "break-even", "bi charts", "ticket médio"'
  },
  {
    keywords: ['bi chart', 'bi charts', 'grafico bi', 'business intelligence'],
    response: 'BI Charts do Dashboard V2:\n\n1) Receita vs Custos vs Break-Even: Compara semanalmente receita, custos e ponto de equilíbrio. Use para identificar semanas em prejuízo.\n\n2) Receita por Categoria: Bebidas vs Pratos vs Sobremesas vs Entradas. Use para ajustar preços e promoções.\n\n3) Receita Semanal: Tendência dos últimos 7 dias. Identifique dias fracos e fortes.\n\nTodos os gráficos atualizam em tempo real com os dados do Supabase.'
  },
  {
    keywords: ['break-even', 'ponto equilibrio', 'ponto de equilíbrio', 'break even'],
    response: '📊 Break-Even (Ponto de Equilíbrio):\n\nCalcula quanto precisa faturar para cobrir custos fixos.\n\nCUSTOS FIXOS = Salários (staffCosts) + Despesas de UTILIDADES\n\n• Se definir valor manual em Sistema → Custos Fixos, esse valor substitui o automático.\n• Se deixar vazio, o sistema calcula: salários de todos os funcionários ativos + despesas com categoria "UTILIDADES".\n\nBreak-Even diário = Custos Fixos Mensais ÷ 30\n\nEx: Salários 450.000 + Utilidades 120.000 = 570.000 Kz/mês. Break-Even diário = 19.000 Kz.'
  },
  {
    keywords: ['ticket medio', 'ticket médio'],
    response: 'Ticket Médio = Faturação total ÷ Número de vendas. Mostra quanto cada cliente gasta em média. Use para: avaliar se precisa de promoções (ticket baixo) ou se pode ajustar preços (ticket alto).'
  },
  {
    keywords: ['taxa ocupacao', 'ocupacao', 'mesas ocupadas'],
    response: 'Taxa de Ocupação = Mesas ocupadas ÷ Total de mesas × 100. Mostra a percentagem de mesas em uso. Use para identificar horas de pico e planear capacidade.'
  },
  {
    keywords: ['margem lucro', 'margem de lucro'],
    response: 'Margem de Lucro = (Receita − Custos) ÷ Receita × 100. Mostra a rentabilidade em percentagem. Margem saudável para restauração: 15-25%. Acima de 25% = excelente. Abaixo de 10% = atenção.'
  },
  {
    keywords: ['grafico', 'graficos', 'chart'],
    response: 'Gráficos do Dashboard V2:\n1) Receita vs Custos vs Break-Even — semanas em prejuízo vs lucro\n2) Receita por Categoria — Bebidas vs Pratos vs Sobremesas\n3) Receita Semanal — tendência de 7 dias\n4) Vendas por Hora — picos de movimento\n5) Top Produtos — os 10 mais vendidos\n\nTodos atualizam em tempo real.'
  },

  // ==================== ANALYTICS ====================
  {
    keywords: ['analytics', 'metricas', 'estatisticas'],
    response: 'Analytics mostra: vendas por período, tendências de crescimento, comparação com períodos anteriores, produtos mais rentáveis, horários de pico, análise por dia da semana. Use para decisões de negócio: ajustar menu, horários staff, promoções.'
  },

  // ==================== CENTRO DE LUCRO ====================
  {
    keywords: ['centro de lucro', 'lucro', 'margem'],
    response: 'Centro de Lucro: Lucro = Receitas − Despesas − Salários − Impostos. Mostra margem atual, comparação mês a mês, alertas quando lucro desce abaixo do limite, e previsões SyncCore (ex: "Stock acaba em 3 dias").'
  },
  {
    keywords: ['previsao', 'previsoes', 'sync core', 'synccore'],
    response: 'Motor SyncCore faz previsões baseadas em dados históricos: "Stock de cerveja acaba em 3 dias", "Sábado esperado: 150 clientes", "Margem abaixo do esperado". Aparece no Centro de Lucro e Dashboard.'
  },

  // ==================== FINANCEIRO ====================
  {
    keywords: ['financeiro', 'financas', 'caixa'],
    response: 'Financeiro inclui:\n1) Fluxo de Caixa — entradas e saídas por dia com saldo automático\n2) Despesas — por categoria com anexo de recibos\n3) AGT — controlo fiscal com SAF-T\n\n💡 Pergunte-me: "fluxo de caixa", "despesas", "agt", "iva"'
  },
  {
    keywords: ['fluxo de caixa', 'entrada', 'saida'],
    response: 'Fluxo de Caixa: Entradas = vendas do POS. Saídas = despesas registadas. Saldo = Entradas − Saídas. Pode filtrar por período e ver tendências. Atualiza automaticamente com cada venda.'
  },
  {
    keywords: ['despesa', 'despesas', 'gasto', 'gastos'],
    response: 'Despesas: Categorias = Compras, Salários, Aluguer, Luz/Água (UTILIDADES), Marketing, Outros. Para cada uma: descrição, valor, data, categoria, anexo de recibo (PDF/imagem). Estados: Pendente, Pago, Cancelado.\n⚠️ Despesas com categoria "UTILIDADES" são usadas no cálculo do Break-Even. Categorize corretamente!'
  },

  // ==================== AGT ====================
  {
    keywords: ['agt', 'fiscal', 'tributaria', 'saf-t', 'saft'],
    response: 'AGT: 1) Registe NIFs dos clientes nas vendas com IVA, 2) Exporte ficheiro SAF-T (formato OGA 2024) para entregar à AGT, 3) Gere relatório mensal de IVA liquidado (7% em Angola). Aceda em Financeiro → AGT.'
  },
  {
    keywords: ['certificacao agt', 'certificação', 'certificado software', 'agt certification'],
    response: 'AGT — Certificação de Software:\n\nGere a certificação do software de faturação junto da AGT.\n\n1) Aceda a AGT → Certificação\n2) Verifique o estado: Pendente, Certificado, ou Rejeitado\n3) Se pendente, prepare os documentos\n4) Submeta o ficheiro SAF-T para validação\n5) Acompanhe até receber a certificação\n\n⚠️ Sem certificação válida, as faturas podem não ser reconhecidas fiscalmente.'
  },
  {
    keywords: ['compliance', 'compliance reports', 'relatorio compliance', 'conformidade'],
    response: 'AGT — Compliance Reports:\n\nRelatórios disponíveis:\n• IVA Mensal — IVA liquidado e a pagar\n• Faturação — Todas as faturas do período\n• Retenções — Retenções na fonte\n• SAF-T — Validação do ficheiro\n• Audit Trail — Registo de alterações para auditoria\n\nComo gerar: AGT → Compliance Reports → selecione tipo e período → "Gerar Relatório" → exporte PDF/Excel.'
  },
  {
    keywords: ['iva', 'imposto'],
    response: 'IVA em Angola (taxa simplificada): 7%. O sistema calcula automaticamente sobre o faturamento. Card "Impostos (7%)" no Dashboard mostra IVA estimado do dia. Para faturas com IVA, registe NIF do cliente no POS. Pode alterar a taxa em Sistema → Configurações.'
  },

  // ==================== STOCK & INVENTORY ====================
  {
    keywords: ['stock', 'produto', 'menu', 'inventario'],
    response: 'Menu & Stock: 1) Adicionar/editar produtos (nome, preço, custo, categoria, imagem), 2) Margem automática (Preço − Custo), 3) Activar/desactivar no POS, 4) Stock mínimo e alertas, 5) Inventário físico e ajustes.'
  },
  {
    keywords: ['alerta stock', 'stock baixo', 'acabar'],
    response: 'Alertas de stock baixo aparecem quando quantidade atinge o stock mínimo definido. Recebe notificação no Dashboard e Menu & Stock. Use para reabastecer antes de ruptura.'
  },
  {
    keywords: ['margem', 'lucro produto'],
    response: 'Margem = Preço de Venda − Custo de Produção. Calculada automaticamente para cada produto. Mostra em % e valor absoluto. Produtos com margem negativa aparecem em vermelho.'
  },
  {
    keywords: ['inventario fisico', 'contagem stock', 'ajustar stock'],
    response: 'Inventário Físico:\n1) Menu & Stock → "INVENTÁRIO"\n2) Sistema mostra todos os produtos com stock atual\n3) Conte fisicamente cada produto e insira o valor real\n4) Sistema calcula diferenças (sobra/falta)\n5) Clique "Confirmar Inventário" para ajustar stock\n\n💡 Faça inventário pelo menos uma vez por mês.'
  },

  // ==================== COMPRAS ====================
  {
    keywords: ['compra', 'compras', 'pedido', 'material'],
    response: 'Fluxo de compras: 1) Funcionário cria pedido (descrição, quantidade, preço, fornecedor), 2) Admin/Owner recebe notificação, 3) Aprovação via Owner Hub possível, 4) Pedido fica "Aprovado", 5) Compra executada e stock actualizado.'
  },
  {
    keywords: ['aprovacao compra', 'aprovar compra', 'purchase approval'],
    response: 'Aprovação de Compras:\n\nNo sistema: Compras → pedidos pendentes → Aprovar/Rejeitar.\n\nRemoto (Owner Hub): Owner Dashboard → notificação de pedido → ver detalhes → Aprovar/Rejeitar com um clique.\n\nO funcionário recebe notificação automática da decisão.'
  },
  {
    keywords: ['fornecedor', 'fornecedores'],
    response: 'Cadastro de fornecedores: Nome, NIF, telefone, email, endereço. O sistema guarda histórico de compras por fornecedor para negociar melhores preços futuros.'
  },

  // ==================== CAPITAL HUMANO ====================
  {
    keywords: ['funcionario', 'funcionarios', 'empregado', 'pessoal'],
    response: 'PASSO A PASSO — Adicionar Funcionário:\n1) Aceda ao menu CAPITAL HUMANO na barra lateral.\n2) Clique "ADICIONAR FUNCIONÁRIO" (canto superior direito).\n3) Preencha NOME COMPLETO, CARGO, NIF (9 dígitos), SALÁRIO BASE.\n4) Escolha TIPO DE CONTRATO (Indeterminado, Determinado, ou Serviço).\n5) Adicione SUBSÍDIOS se aplicável (Alimentação, Transporte, Bónus).\n6) Assinale ISENÇÃO DE IRT apenas se aplicável.\n7) Clique "GUARDAR FUNCIONÁRIO".'
  },
  {
    keywords: ['folha salarial', 'salario', 'pagamento funcionario'],
    response: 'PASSO A PASSO — Processar Folha Salarial:\n1) Capital Humano → Folha de Salário.\n2) Clique "INICIAR PROCESSAMENTO DO MÊS".\n3) Sistema carrega funcionários ativos com salários e subsídios.\n4) Adicuste ajustes: Horas Extras (+), Outros Descontos (−).\n5) Sistema calcula: BRUTO, INSS (3%), IRT (tabela OGE 2024), LÍQUIDO.\n6) Verifique valores.\n7) Clique "FECHAR E PROCESSAR FOLHA".\n8) Folha gravada com nº RV-AAAA-MM-NNN.\n⚠️ Depois de fechada, a folha NÃO pode ser alterada.'
  },
  {
    keywords: ['inss', 'seguranca social'],
    response: 'INSS Angola: Trabalhador paga 3% sobre (Salário + Bónus). Empregador paga 8% sobre mesma base. Calculado automaticamente na folha salarial. Pago mensalmente à Segurança Social.'
  },
  {
    keywords: ['irt', 'imposto rendimento'],
    response: 'IRT Angola (tabela progressiva OGE 2024): Escalões 1(10%), 2(13%), 3(16%), 4(18.5%), 5(19%), 6(20%), 7(21%). Salários até 100.000 Kz isentos. Calculado automaticamente na folha.'
  },
  {
    keywords: ['recibo', 'recibo funcionario'],
    response: 'Recibos individuais: Capital Humano → Folha → ícone de impressora. Inclui: logotipo, dados do funcionário, salário base, subsídios, horas extras, INSS, IRT, bruto e líquido. Pode imprimir ou guardar PDF.'
  },

  // ==================== OWNER DASHBOARD ====================
  {
    keywords: ['owner', 'owner hub', 'proprietario', 'remoto', 'owner dashboard'],
    response: 'Owner Dashboard: Aceda em https://rest-ia.vercel.app/owner. O proprietário pode:\n1) Ver Dashboard completo em tempo real\n2) Ver Fecho do Dia (card azul/cinzento)\n3) Aprovar/rejeitar pedidos de compra\n4) Ver relatórios de vendas e despesas\n5) Monitorizar lucro e margens\n6) Aceder de qualquer lugar (telefone, tablet, computador)\n\n💡 O card "Fecho do Dia" mostra o valor do fecho. Se vazio, o sistema cria automaticamente (fecho retroativo).'
  },
  {
    keywords: ['fecho caixa owner', 'card fecho', 'fecho vazio'],
    response: 'Card "Fecho do Dia" no Owner Dashboard:\n\n• Azul escuro = fecho existe (valor disponível)\n• Cinzento = sem fecho (será criado automaticamente)\n\nSe o card estiver vazio/cinzento, significa que o fecho manual não foi feito. Quando abrir o Owner Dashboard depois das 05:00, o sistema cria automaticamente um fecho retroativo com a soma das vendas do dia anterior.\n\nO valor pode diferir do fecho manual porque inclui TODAS as vendas com status "closed"/"paid" do dia.'
  },

  // ==================== IMPRESSORA ====================
  {
    keywords: ['impressora', 'printer', 'configurar impressora', 'impressora termica'],
    response: 'Configuração de Impressora:\n\n1) Aceda a Configuração de Impressora (Sistema ou URL /printer-config)\n2) Selecione tipo: USB, Rede, ou Sem impressora\n3) Configure: largura do papel (58mm/80mm/A4), velocidade, corte automático\n4) Clique "TESTAR IMPRESSÃO" para verificar\n5) Se OK, clique "GUARDAR"\n\nLayout do recibo: logotipo, NIF, endereço, itens, IVA, total, método de pagamento.\n\n💡 Pode configurar uma impressora separada para a cozinha (tickets de pedido).'
  },
  {
    keywords: ['impressao cozinha', 'ticket cozinha', 'imprimir cozinha'],
    response: 'Impressão de Cozinha:\n\nPode configurar uma impressora separada para a cozinha que imprime tickets de pedido com:\n• Número da mesa\n• Itens e quantidades\n• Observações (ex: "sem cebola")\n\nConfigure em Sistema → Configurações → Impressora de Cozinha.'
  },

  // ==================== MENU PÚBLICO ====================
  {
    keywords: ['menu publico', 'qr code', 'menu digital', 'menu cliente'],
    response: 'Menu Público Digital (QR Code):\n\n• URL: https://rest-ia.vercel.app/menu\n• O cliente aponta a câmara do telemóvel para o QR Code e o menu abre no browser — sem instalar nada.\n• Mostra: categorias, foto, nome, descrição, preço, disponibilidade.\n• Atualiza automaticamente quando o admin altera produtos em Menu & Stock.\n• Pode imprimir QR Codes para colocar nas mesas.\n\nConfigure em Sistema → Menu Público.'
  },

  // ==================== SISTEMA ====================
  {
    keywords: ['sistema', 'configuracoes', 'configurar', 'systemhub'],
    response: 'Sistema (SystemHub):\n\n1) DADOS GERAIS: Nome, NIF, endereço, taxa IVA (7%)\n2) CUSTOS FIXOS MENSAIS: Para cálculo do Break-Even. Deixe vazio para usar salários + UTILIDADES automático.\n3) GESTÃO DE UTILIZADORES: Criar/editar utilizadores, PIN, permissões\n4) SUPABASE: URL e chave, testar ligação, diagnosticar\n5) MENU PÚBLICO: Activar/desactivar, QR Code\n\n💡 Pergunte-me: "utilizadores", "supabase", "custos fixos", "permissões"'
  },
  {
    keywords: ['custos fixos', 'custos fixos mensais'],
    response: 'Custos Fixos Mensais (Break-Even):\n\nEm Sistema → Custos Fixos Mensais, pode definir manualmente o valor dos custos fixos.\n\n• Se preencher: o sistema usa este valor para o Break-Even.\n• Se deixar vazio: o sistema calcula automaticamente = Salários (staffCosts) + Despesas de UTILIDADES.\n\n💡 Recomendado: deixar vazio para usar o cálculo automático. O sistema soma automaticamente os salários de todos os funcionários ativos + despesas categorizadas como "UTILIDADES".'
  },
  {
    keywords: ['utilizador', 'utilizadores', 'user', 'gestao utilizadores'],
    response: 'Gestão de Utilizadores:\n\nFunções: Garçom (apenas POS), Caixa (POS + fecho), Gerente (tudo menos config), Proprietário (acesso total).\n\nPermissões: POS_SALES (vendas), STOCK_MANAGE (stock/compras), FINANCE_VIEW (financeiro/relatórios), SYSTEM_CONFIG (config/sistema).\n\nCriar: Sistema → Gestão de Utilizadores → Novo → Nome, função, PIN (4 dígitos), permissões → Guardar.'
  },
  {
    keywords: ['pin', 'senha', 'password', 'acesso'],
    response: 'PIN de 4 dígitos para cada utilizador. Nunca partilhe o seu PIN. Administradores podem redefinir PINs em Sistema → Gestão de Utilizadores. Se esquecer, contacte o administrador.'
  },
  {
    keywords: ['permissao', 'permissoes', 'acesso menu'],
    response: 'Permissões: POS_SALES = Terminal POS e vendas. STOCK_MANAGE = Menu & Stock, Compras, Inventário. FINANCE_VIEW = Dashboard, Financeiro, Relatórios, Analytics. SYSTEM_CONFIG = Configurações, Gestão de Utilizadores, Supabase.'
  },

  // ==================== SUPABASE & OFFLINE ====================
  {
    keywords: ['supabase', 'backup', 'nuvem', 'cloud'],
    response: 'Supabase = base de dados na nuvem. Serve para: backup automático, sincronização entre dispositivos, acesso remoto Owner Hub. Configure em Sistema → Supabase (URL e chave). Use "Diagnosticar" para verificar estado.'
  },
  {
    keywords: ['sincronizacao', 'sync', 'sincronizar'],
    response: 'Sincronização automática: dados locais (localStorage, funciona offline) + Supabase (backup nuvem). Se perder internet, continue a vender. Quando voltar online, sincroniza automaticamente. Sem perda de dados.'
  },
  {
    keywords: ['offline', 'sem internet', 'internet', 'nao tem net'],
    response: 'A app funciona OFFLINE! Quando não há internet: 1) Continue a fazer vendas normalmente no POS, 2) Os dados são guardados no localStorage, 3) Quando a internet voltar, tudo sincroniza automaticamente com o Supabase. Não perde vendas, não perde dados.'
  },

  // ==================== RELATÓRIOS ====================
  {
    keywords: ['relatorio', 'relatorios', 'report'],
    response: 'Relatórios disponíveis:\n1) Vendas por Período (dia/semana/mês)\n2) Vendas por Funcionário (performance POS)\n3) Vendas por Produto\n4) Vendas por Mesa\n5) Métodos de Pagamento\n6) Movimentação de Stock\n7) Fluxo de Caixa\n8) Folha Salarial\n9) Despesas por categoria\n10) Relatórios Fiscais (AGT)\n\nTodos exportáveis em PDF ou Excel.'
  },
  {
    keywords: ['exportar', 'pdf', 'excel'],
    response: 'Todos os relatórios exportam em PDF (layout oficial com logotipo) ou Excel .xlsx. Botão de exportação no canto superior direito de cada relatório. No Manual também pode exportar para PDF com botão "PDF" no topo.'
  },

  // ==================== CONTROLO DE VENDAS ====================
  {
    keywords: ['controlo vendas', 'vendas', 'sales control', 'analise vendas'],
    response: 'Controlo de Vendas:\n\nMostra análise detalhada de cada produto vendido:\n• Vendas por produto: quantidade, receita, margem\n• Comparação de períodos: Hoje vs Ontem, Semana vs Semana\n• Ranking de produtos: mais e menos vendidos\n• Análise por categoria\n• Ticket médio\n\nComo usar: VENDAS → selecione período → veja gráficos → use filtros → exporte PDF/Excel.'
  },

  // ==================== MAPA DE SALA ====================
  {
    keywords: ['mapa', 'mapa de sala', 'mesas', 'layout'],
    response: 'Mapa de Sala: Verde = livre, Laranja = ocupada (pedido aberto), Vermelho = dívida (não pago), Azul = reserva. Clique para abrir POS. Arraste para reorganizar layout. Clique direito para histórico dos últimos 30 dias.'
  },
  {
    keywords: ['cor', 'cores', 'verde', 'laranja', 'vermelho', 'azul'],
    response: 'Cores mesas: Verde = livre (sem pedido), Laranja = ocupada (pedido aberto), Vermelho = dívida (não pago), Azul = reserva marcada.'
  },

  // ==================== RESERVAS ====================
  {
    keywords: ['reserva', 'reservas', 'marcar', 'marcacao'],
    response: 'PASSO A PASSO — Criar Reserva:\n1) Clique em RESERVAS na barra lateral.\n2) Clique "NOVA RESERVA" (canto superior direito).\n3) Preencha: Nome, Telefone (+244), Data, Hora (24h), Nº de pessoas, Mesa preferida (opcional).\n4) Em OBSERVAÇÕES, adicione detalhes (aniversário, VIP, alergias).\n5) Clique "GUARDAR RESERVA".\n6) A mesa fica AZUL no Mapa de Sala.\n✅ Pode editar/cancelar até 2 horas antes.'
  },

  // ==================== EVENTOS ====================
  {
    keywords: ['evento', 'eventos', 'casamento', 'aniversario'],
    response: 'Eventos: 1) Menu Eventos → "NOVO EVENTO", 2) Preencha tipo, nome, data, nº convidados, menu especial, preço por pessoa, 3) Sistema calcula: receita = convidados × preço, custo estimado, lucro estimado, 4) Guarde e acompanhe.'
  },

  // ==================== LOGIN ====================
  {
    keywords: ['login', 'entrar', 'entrar no sistema', 'acesso'],
    response: 'Login: Digite PIN de 4 dígitos no ecrã de login. Se esquecer, contacte administrador para redefinição. Administradores = acesso total. Garçons = apenas POS (vendas).'
  },

  // ==================== MANUAL & BOT ====================
  {
    keywords: ['manual', 'como usar', 'tutorial'],
    response: 'O MANUAL está no menu "MANUAL" na barra lateral. Tem duas abas: "Utilizador" (garçons e caixas) e "Administrador" (gerentes e proprietário). Cobrem TODOS os menus da app com passo-a-passo detalhado. Pode exportar para PDF. O BOT está no canto inferior direito — clique e faça perguntas sobre qualquer funcionalidade.'
  },

  // ==================== GERAL ====================
  {
    keywords: ['app', 'rest ia', 'sistema', 'o que é', 'rest ia os'],
    response: 'REST IA OS é o sistema completo de gestão da Tasca do Vereda. Inclui: POS (vendas), Mapa de Sala, Reservas, Eventos, Menu & Stock, Compras, Capital Humano, Financeiro (caixa, AGT), Dashboard V2 com BI Charts, Analytics, Relatórios, Owner Dashboard, Menu Público Digital. Tudo sincronizado na nuvem via Supabase.'
  },
  {
    keywords: ['ajuda', 'help', 'socorro', 'nao sei'],
    response: 'Posso ajudar com: Terminal POS, Mapa de Sala, Reservas, Eventos, Menu & Stock, Compras, Capital Humano, Financeiro, AGT (Certificação + Compliance), Dashboard V2 (BI Charts, Break-Even), Analytics, Centro de Lucro, Relatórios, Owner Dashboard, Impressora, Menu Público, Configurações, Supabase. Sobre o que quer saber?'
  },
  {
    keywords: ['ola', 'oi', 'hey', 'bom dia', 'boa tarde', 'boa noite'],
    response: '👋 Olá! Sou o assistente virtual do REST IA OS.\n\nPosso ajudar com:\n• Terminal POS (vendas, mesas, pagamentos)\n• Dashboard V2 & BI Charts (Break-Even)\n• Menu & Stock, Inventário\n• Capital Humano (folha salarial)\n• Financeiro, AGT, Compliance\n• Owner Dashboard, Compras\n• Impressora, Menu Público\n• Configurações & Supabase\n\n💡 Pergunte-me: "como abrir mesa", "break-even", "fecho automático", "adicionar funcionário", etc.'
  },
  {
    keywords: ['obrigado', 'valeu', 'thanks', 'grato', 'agradeço'],
    response: 'De nada! Estou aqui sempre que precisar. Bom trabalho na Tasca do Vereda! 🚀'
  }
];

export const getBotResponse = (input: string): string => {
  const lower = input.toLowerCase();
  
  // Procura por keywords — prefere keywords mais longas (mais específicas)
  let bestMatch: BotResponse | null = null;
  let bestScore = 0;
  
  for (const entry of botKnowledge) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }
  }
  
  if (bestMatch) return bestMatch.response;
  
  // Saudações
  if (lower.match(/\b(ola|oi|hey|bom dia|boa tarde|boa noite)\b/)) {
    return '👋 Olá! Sou o assistente virtual do REST IA OS.' +
      '\n\nPosso ajudar com:' +
      '\n• Terminal POS (vendas, mesas, pagamentos)' +
      '\n• Dashboard V2 & BI Charts (Break-Even)' +
      '\n• Menu & Stock, Inventário' +
      '\n• Capital Humano (folha salarial)' +
      '\n• Financeiro, AGT, Compliance' +
      '\n• Owner Dashboard, Compras' +
      '\n• Impressora, Menu Público' +
      '\n• Configurações & Supabase' +
      '\n\n💡 Pergunte-me: "como abrir mesa", "break-even", "fecho automático", "adicionar funcionário", etc.';
  }
  
  // Agradecimentos
  if (lower.match(/\b(obrigado|valeu|thanks|grato|agradeço)\b/)) {
    return 'De nada! Estou aqui sempre que precisar. Bom trabalho na Tasca do Vereda! 🚀';
  }
  
  // Ajuda genérica
  if (lower.match(/\b(ajuda|help|socorro|como funciona|nao sei)\b/)) {
    return 'Posso ajudar com: Terminal POS, Mapa de Sala, Reservas, Eventos, Menu & Stock, Compras, Capital Humano, Financeiro, AGT (Certificação + Compliance), Dashboard V2 (BI Charts, Break-Even), Analytics, Centro de Lucro, Relatórios, Owner Dashboard, Impressora, Menu Público, Configurações, Supabase. Sobre o que quer saber?';
  }
  
  // Fallback inteligente
  return '❓ Não percebi bem essa pergunta.' +
    '\n\nTente perguntar de outra forma, por exemplo:' +
    '\n• "como abrir mesa"' +
    '\n• "break-even"' +
    '\n• "fecho automático"' +
    '\n• "adicionar funcionário"' +
    '\n• "configurar impressora"' +
    '\n• "menu público qr code"' +
    '\n• "owner dashboard"' +
    '\n• "compliance agt"' +
    '\n\n📖 Ou consulte o Manual completo em: MENU → MANUAL';
};
