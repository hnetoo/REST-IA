# RELATÓRIO ESTRATÉGICO — CAMINHO PARA #1 EM ANGOLA E EXPANSÃO REGIONAL

## 🌍 ANÁLISE COMPETITIVA

### Concorrentes em Angola:
- **Sistemas genéricos** (Excel, papel) — 70% do mercado
- **Softwares importados** (portugueses, sul-africanos) — 20%
- **Sistemas locais** (poucos, básicos) — 10%

### Vantagens competitivas atuais da nossa app:
- Conformidade fiscal AGT (faturação eletrónica) ✅
- Fecho de dia automatizado ✅
- Motor sync em tempo real ✅
- Funcionamento offline ✅
- Dashboard com IA ✅
- App em português ( Angola ) ✅

### O que nos falta para dominar o mercado:

---

## 🎯 PILARES ESTRATÉGICOS PARA #1

### PILAR 1: PAGAMENTOS DIGITAIS (Prioridade CRÍTICA)
**Porquê:** Angola está a adotar pagamentos móveis rapidamente (Unitel Money, Africell Money, Multicaixa Express).

**O que implementar:**
- Integração com **Multicaixa Express** (pagamentos por QR no POS)
- Integração com **Unitel Money** (pagamento via telemóvel)
- Integração com **Africell Money**
- Pagamento por **cartão bancário** (POS integration)
- **Split payment** (dividir conta entre vários métodos)
- **Pix-style QR** para pagamento instantâneo

**Impacto:** Sem isto, perdemos clientes que querem pagar sem dinheiro físico
**Esforço:** Alto (requer parcerias com operadores)

---

### PILAR 2: APP MÓVEL PARA GARÇONS (Prioridade ALTA)
**Porquê:** Garçons andam com papel e caneta. Dar-lhes um telemóvel/tablet acelera serviço em 40%.

**O que implementar:**
- App React Native ou PWA para garçons
- Tomar pedidos à mesa no telemóvel
- Enviar diretamente para a cozinha (KDS)
- Ver estado do pedido em tempo real
- Chamar gestão para mesa (assistência)
- Receber notificações quando prato está pronto

**Impacto:** Reduz tempo de espera, aumenta satisfação, mais mesas atendidas
**Esforço:** Médio (PWA é mais rápido que nativo)

---

### PILAR 3: PEDIDOS ONLINE E DELIVERY PRÓPRIO (Prioridade ALTA)
**Porquê:** Glovo/Uber Eats cobram 25-30% de comissão. Ter plataforma própria poupa milhares.

**O que implementar:**
- **Site de pedidos online** (menu digital público)
- **App de delivery própria** (cliente pede, restaurante entrega)
- **Integração com Glovo/Uber Eats** (quando cliente quer, mas com markup)
- **WhatsApp Ordering** — cliente pede via WhatsApp, entra no sistema automaticamente
- **QR Code na mesa** — cliente扫描a, vê menu, pede sem garçom
- **Pagamento online** no ato do pedido

**Impacto:** Novo canal de receita, independência de plataformas
**Esforço:** Médio (já temos `PublicMenu.tsx` e `CustomerDisplay.tsx`)

---

### PILAR 4: PROGRAMA DE FIDELIZAÇÃO (Prioridade MÉDIA)
**Porquê:** Reter clientes custa 5x menos que adquirir novos.

**O que implementar:**
- **Sistema de pontos** (1 ponto por cada 100 Kz gastado)
- **Promoções automáticas** (cliente frequente ganha desconto)
- **Cartão digital** (QR code no telemóvel)
- **Cashback** (5% do valor em crédito para próxima visita)
- **Promoções de aniversário** (desconto automático)
- **Happy Hour engine** (preços diferentes por horário)
- **Refer-a-friend** (cliente indica, ambos ganham crédito)

**Impacto:** Aumenta frequência de visita e ticket médio
**Esforço:** Médio

---

### PILAR 5: GESTÃO DE RECEITAS E CUSTOS (Prioridade MÉDIA)
**Porquê:** Saber o custo real de cada prato é essencial para rentabilidade.

**O que implementar:**
- **Receitas/BOM** (Bill of Materials) — cada prato tem ingredientes com quantidades
- **Custo automático** — calcular custo de cada prato com base nos preços de compra atuais
- **Margem por prato** — lucro real de cada item do menu
- **Alertas de margem baixa** — pratos que deixaram de ser rentáveis
- **Alérgenos** — marcar alérgenos em cada prato (obrigatório por lei)
- **Informação nutricional** — calorias, macros por prato
- **Sugestão de preço** — IA sugere preço ideal baseado em custo + margem + mercado

**Impacto:** Otimiza rentabilidade, compliance alimentar
**Esforço:** Médio

---

### PILAR 6: INTELIGÊNCIA DE NEGÓCIO (Prioridade MÉDIA)
**Porquê:** Dados sem insights são inúteis. IA pode prever vendas e otimizar operações.

**O que implementar:**
- **Previsão de vendas** — IA prevê quantas vendas por dia (baseado em histórico, dia da semana, eventos)
- **Otimização de stock** — IA sugere quanto comprar e quando
- **Análise de pratos** — quais vendem mais, quais têm melhor margem
- **Análise de horários** — quando há mais/menos clientes
- **Otimização de staff** — quantos garçons/cozinheiros por turno
- **Detecção de anomalias** — vendas anormalmente baixas, desperdício
- **Benchmark** — comparar com médias do setor

**Impacto:** Decisões baseadas em dados, não intuição
**Esforço:** Médio (já temos base com `useSyncCore` e IA no dashboard)

---

### PILAR 7: MULTI-LÍNGUA E MULTI-MOEDA (Prioridade MÉDIA)
**Porquê:** Para expansão regional (CPLP: Moçambique, Cabo Verde, S. Tomé, Guiné-Bissau).

**O que implementar:**
- **Multi-idioma** — Português, Inglês, Francês (i18n)
- **Multi-moeda** — AOA, USD, EUR, MZN (com conversão automática)
- **Multi-taxa** — diferentes taxas de IVA por país
- **Adaptação fiscal** — cada país tem regras fiscais diferentes
- **Formatos locais** — datas, moedas, telefones por país

**Impacto:** Permite expansão para 5+ países CPLP
**Esforço:** Alto (mas faseado)

---

### PILAR 8: GESTÃO DE FRANQUIAS/MULTI-LOJA (Prioridade BAIXA-MÉDIA)
**Porquê:** Restaurantes de sucesso abrem múltiplas lojas. O sistema precisa suportar isso.

**O que implementar:**
- **Multi-estabelecimento** — uma conta, várias lojas
- **Relatórios consolidados** — ver todas as lojas ou comparar
- **Transferência de stock** entre lojas
- **Preços diferentes por loja** (mesmo menu, preços diferentes)
- **Gestão centralizada de staff** (funcionários podem trabalhar em várias lojas)
- **Dashboard comparativo** — ranking de lojas por performance

**Impacto:** Atrai cadeias de restaurantes
**Esforço:** Alto

---

### PILAR 9: AUTOMAÇÃO DE COMPRAS E FORNECEDORES (Prioridade MÉDIA)
**Porquê:** Gestão manual de compras é lenta e propensa a erros.

**O que implementar:**
- **Cadastro de fornecedores** (contactos, prazos, condições)
- **Reposição automática** — quando stock baixa, gera pedido de compra
- **Comparação de preços** — vários fornecedores para mesmo item
- **Avaliação de fornecedores** — tempo de entrega, qualidade, preço
- **Contratos e negociação** — preços fechados por período
- **Receção de mercadoria** — confirmar entrega, atualizar stock
- **Conciliação de faturas** — comparar fatura com pedido recebido

**Impacto:** Reduz custos de compra, evita rupturas de stock
**Esforço:** Médio

---

### PILAR 10: COMPLIANCE E SEGURANÇA AVANÇADA (Prioridade MÉDIA)
**Porquê:** Restaurantes lidam com dados sensíveis (fiscais, clientes, pagamentos).

**O que implementar:**
- **RGPD/LOPDP** — Lei de Proteção de Dados de Angola
- **Auditoria completa** — quem fez o quê, quando (já temos `audit_logs`)
- **Backup automático** — backups periódicos para nuvem
- **Gestão de permissões granular** — cada utilizador só vê o que precisa
- **2FA** — autenticação de dois fatores para gestores
- **Logs de acesso** — registo de logins e ações sensíveis
- **Encriptação** — dados sensíveis encriptados em trânsito e repouso

**Impacto:** Confiança de grandes clientes (cadeias, hoteis)
**Esforço:** Médio

---

## 📊 MATRIZ DE PRIORIDADE

| Pilar | Impacto Mercado | Esforço | Prioridade | Prazo |
|---|---|---|---|---|
| 1. Pagamentos digitais | Crítico | Alto | 🔴 Imediato | 3 meses |
| 2. App garçons | Alto | Médio | 🔴 Imediato | 2 meses |
| 3. Pedidos online/delivery | Alto | Médio | 🔴 Imediato | 3 meses |
| 4. Fidelização | Médio | Médio | 🟡 Curto prazo | 2 meses |
| 5. Receitas e custos | Médio | Médio | 🟡 Curto prazo | 2 meses |
| 6. BI/IA | Médio | Médio | 🟡 Curto prazo | 3 meses |
| 7. Multi-língua/moeda | Alto | Alto | 🟢 Médio prazo | 6 meses |
| 8. Multi-loja | Médio | Alto | 🟢 Médio prazo | 6 meses |
| 9. Automação compras | Médio | Médio | 🟡 Curto prazo | 2 meses |
| 10. Compliance/segurança | Médio | Médio | 🟢 Médio prazo | 4 meses |

---

## 🏆 O QUE NOS TORARIA #1 EM ANGOLA (TOP 3)

Se implementarmos apenas 3 coisas para dominar o mercado angolano:

1. **Pagamentos digitais (Multicaixa Express + Mobile Money)** — Nenhum concorrente local tem isto bem integrado
2. **App de garçons (PWA)** — Transforma a operação, visível ao cliente
3. **Delivery próprio + WhatsApp Ordering** — Independência de plataformas

---

## 🌍 O QUE NOS TORARIA LÍDER REGIONAL (CPLP)

1. **Multi-língua (PT/EN/FR)** — Acessível a turistas e expatriados
2. **Compliance fiscal adaptável** — Cada país CPLP tem regras próprias
3. **Multi-moeda** — Essencial para operar em vários países
4. **App de garços multi-plataforma** — Funciona em qualquer telemóvel

---

## 📈 ROADMAP SUGERIDO

### Q3 2026 (Jul-Set):
- App garçons PWA
- Pagamentos Multicaixa Express
- WhatsApp Ordering
- Melhorias menu Compras (as 7 aprovadas)

### Q4 2026 (Out-Dez):
- Delivery próprio
- Programa de fidelização
- Receitas e custos (BOM)
- Automação de compras/fornecedores

### Q1 2027 (Jan-Mar):
- BI/IA avançada
- Compliance/segurança
- Multi-idioma (PT/EN)

### Q2 2027 (Abr-Jun):
- Multi-moeda
- Multi-loja
- Expansão CPLP (Moçambique primeiro)

---

## ✅ APROVAÇÃO

Este relatório é para orientação estratégica. As melhorias do menu Compras (7 melhorias) serão implementadas imediatamente conforme aprovado.

**Comentários do gestor:** _________________________________________________

---

*Documento criado em 20/06/2026 — Análise estratégica para posicionamento #1 em Angola e expansão regional.*
