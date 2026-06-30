# ESTRATÉGIA PARA GARANTIR FECHO DO DIÁRIO CORRETO

## 📊 SITUAÇÃO ATUAL

### Problemas Identificados:
1. **7 dias sem fecho em junho/2026** — operador não clicou "Confirmar Fecho"
2. **Bug de timezone corrigido** — fechos registados no dia errado
3. **Confusão UI** — operador gera "Preview/Imprimir" e pensa que o fecho está feito
4. **Sem lembrete automático** — nada força o operador a fazer o fecho

### Impacto:
- Dados financeiros inconsistentes
- Relatórios de dashboard incorretos
- Dificuldade em auditar vendas por dia

---

## 🎯 PROPOSTAS (para aprovação)

### MEDIDA 1: Lembrete Automático Diário (Prioridade ALTA)

**O que:** Às 22:00 (hora de Luanda), se ainda não houver fecho do dia, mostrar um alerta modal bloqueante no POS.

**Como funciona:**
- A cada 30 minutos, o POS verifica se o dia atual já tem fecho em `cash_flow`
- Se não tiver e for após as 22:00, mostra modal: "⚠️ ATENÇÃO: O dia ainda não foi fechado! Tem X vendas no valor de Y Kz. Deseja fechar agora?"
- Botões: "Fechar Agora" / "Lembrar em 30 min" / "Ignorar Hoje" (com registo de quem ignorou)

**Vantagens:**
- Não obriga, mas lembra ativamente
- Regista quem ignorou (auditabilidade)
- Não interrompe operações durante o dia

**Complexidade:** Baixa — verificar `cash_flow` por `data_contabil` + modal

---

### MEDIDA 2: Bloqueio de Novas Vendas Após Meia-noite sem Fecho (Prioridade ALTA)

**O que:** Se passar da meia-noite (hora de Luanda) e o dia anterior não tiver fecho, o POS bloqueia novas vendas até fazer o fecho.

**Como funciona:**
- Ao iniciar nova venda, verifica se o dia anterior tem fecho
- Se não tiver, mostra tela bloqueante: "🔒 Não é possível iniciar novas vendas. O dia DD/MM ainda não foi fechado. Faça o fecho primeiro."
- Só libera após `executeCashClosing` ser executado com sucesso

**Vantagens:**
- Garante 100% que nenhum dia fica sem fecho
- Obriga o operador a cumprir o processo
- Impede mistura de vendas de dias diferentes

**Desvantagens:**
- Pode frustrar o operador se tiver urgência
- Se houver falha de rede, pode bloquear indevidamente

**Mitigação:** Modo de emergência com senha de gerente para desbloquear (com log de auditoria)

**Complexidade:** Média — verificação no fluxo de nova venda + tela de bloqueio

---

### MEDIDA 3: Indicador Visual Permanente no POS (Prioridade MÉDIA)

**O que:** Mostrar um badge/indicador no header do POS com o estado do fecho do dia.

**Como funciona:**
- Badge verde "✅ Dia Fechado" se o dia atual já tem fecho
- Badge vermelho pulsante "❌ Dia por Fechar" se não tem fecho
- Badge amarelo "⏰ Fecho Pendente" se passou das 22:00 sem fecho
- Mostra também: "Último fecho: DD/MM às HH:MM"

**Vantagens:**
- Visibilidade constante sem ser intrusivo
- Operador vê o estado a qualquer momento
- Gestor pode verificar rapidamente ao passar

**Complexidade:** Baixa — componente pequeno no header

---

### MEDIDA 4: Fecho Automático de Segurança (Prioridade MÉDIA)

**O que:** Às 04:59 (fim do dia operacional), se não houver fecho, o sistema faz um fecho automático.

**Como funciona:**
- Job automático às 04:59 verifica se o dia que está a acabar tem fecho
- Se não tiver, calcula o total das vendas closed/paid e insere em `cash_flow`
- Marca `closed_by = "Sistema (Auto-Fecho)"` para distinguir dos fechos manuais
- Regista em `fecho_diagnostico_logs` com step `AUTO_CLOSING_EXECUTED`
- Notifica no próximo login: "ℹ️ O dia DD/MM foi fechado automaticamente pelo sistema (sem intervenção do operador)"

**Vantagens:**
- Garantia absoluta de que nenhum dia fica sem fecho
- Mesmo se o operador esquecer, os dados ficam registados
- Distingue fechos manuais de automáticos

**Desvantagens:**
- Fecho automático pode não incluir contagens de caixa físico (dinheiro em mão)
- Se houver vendas atrasadas (sync), o total pode estar incompleto

**Mitigação:** Permitir re-fecho manual que atualiza o valor do fecho automático

**Complexidade:** Média — timer/scheduler + verificação + insert

---

### MEDIDA 5: Relatório Semanal de Conformidade (Prioridade BAIXA)

**O que:** Toda segunda-feira, gerar um relatório de conformidade de fechos da semana anterior.

**Como funciona:**
- Verifica todos os dias da semana anterior
- Para cada dia: tem fecho? foi manual ou automático? quem fechou? valor bate com vendas?
- Envia notificação no dashboard: "📋 Relatório de Conformidade: 6/7 dias fechados corretamente"
- Destaca dias problemáticos em vermelho

**Vantagens:**
- Auditoria semanal sem esforço
- Identifica padrões (ex: operador nunca fecha aos domingos)
- Permite intervenção gestora antes de acumular muitos dias sem fecho

**Complexidade:** Baixa — query + notificação

---

### MEDIDA 6: Eliminar Confusão Preview vs Fecho (Prioridade ALTA)

**O que:** Restruturar o fluxo de fecho para que não haja separação entre "ver relatório" e "confirmar fecho".

**Como funciona:**
- **ANTES (atual):** Botão "Confirmar Fecho" → Modal → "Ver Relatório" (preview, não grava) OU "Confirmar" (grava)
- **DEPOIS (proposto):** Botão "Fecho do Dia" → Mostra relatório com totais → Botão único "Confirmar e Gravar Fecho" → Grava + imprime
- Eliminar a opção de "apenas preview" — o relatório é sempre mostrado ANTES de gravar, e o botão único faz ambas as coisas
- Se o operador quiser apenas ver sem gravar, pode fechar o modal (mas verá aviso vermelho)

**Vantagens:**
- Elimina completamente a fonte de confusão
- Operador vê o relatório E grava no mesmo passo
- Não há caminho que leve a "think it's done" sem estar

**Complexidade:** Baixa — reorganização do fluxo existente

---

## 📋 PRIORIDADES RECOMENDADAS

| Prioridade | Medida | Impacto | Esforço |
|---|---|---|---|
| 1ª | MEDIDA 6 — Eliminar confusão Preview vs Fecho | Alto | Baixo |
| 2ª | MEDIDA 1 — Lembrete às 22:00 | Alto | Baixo |
| 3ª | MEDIDA 3 — Indicador visual no header | Médio | Baixo |
| 4ª | MEDIDA 2 — Bloqueio após meia-noite | Alto | Médio |
| 5ª | MEDIDA 4 — Fecho automático de segurança | Alto | Médio |
| 6ª | MEDIDA 5 — Relatório semanal | Baixo | Baixo |

---

## 🚀 IMPLEMENTAÇÃO RECOMENDADA (FASES)

### FASE 1 (Imediato — já parcialmente feito):
- ✅ Bug timezone corrigido
- ✅ UI: botão "Confirmar Fecho" mais visível
- ✅ UI: aviso de que preview não grava
- 📋 MEDIDA 6: Eliminar separação preview/fecho

### FASE 2 (Próxima sprint):
- 📋 MEDIDA 3: Indicador visual no header do POS
- 📋 MEDIDA 1: Lembrete automático às 22:00

### FASE 3 (Médio prazo):
- 📋 MEDIDA 2: Bloqueio de vendas sem fecho do dia anterior
- 📋 MEDIDA 4: Fecho automático de segurança às 04:59

### FASE 4 (Longo prazo):
- 📋 MEDIDA 5: Relatório semanal de conformidade

---

## ⚠️ RISCOS E CONSIDERAÇÕES

1. **Fecho automático vs contagem física:** O fecho automático usa o total das vendas digitais, mas pode não incluir dinheiro físico em caixa. Considerar adicionar campo `contagem_fisica` opcional no fecho manual.

2. **Operador de turno:** Se houver mudança de turno, o fecho deve ser responsabilidade de quem fecha o turno, não necessariamente à meia-noite.

3. **Modo offline:** Se o sistema estiver offline, o fecho deve ser guardado localmente e sincronizado quando voltar online.

4. **Auditoria:** Todas as ações de "ignorar lembrete" ou "desbloquear emergência" devem ser registadas em `fecho_diagnostico_logs` ou `audit_logs`.

---

## ✅ APROVAÇÃO

Para prosseguir com a implementação, favor aprovar:

- [ ] MEDIDA 1 — Lembrete às 22:00
- [ ] MEDIDA 2 — Bloqueio após meia-noite
- [ ] MEDIDA 3 — Indicador visual no header
- [ ] MEDIDA 4 — Fecho automático de segurança
- [ ] MEDIDA 5 — Relatório semanal de conformidade
- [ ] MEDIDA 6 — Eliminar confusão Preview vs Fecho

**Comentários do gestor:** _________________________________________________

---

*Documento criado em 20/06/2026 para aprovação antes de implementação.*
