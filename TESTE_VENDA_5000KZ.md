# 🧪 TESTE DE VENDA - 5.000 Kz

## 📋 INSTRUÇÕES PARA TESTE FINAL

### 1. 🧪 FAZER VENDA DE TESTE
1. Abra a app Windows (Terminal POS)
2. Selecione qualquer mesa
3. Adicione um produto com valor **exato de 5.000 Kz**
4. Feche a venda com qualquer método de pagamento
5. Anote o ID da ordem criada

### 2. 📊 VERIFICAÇÃO ESPERADA

#### 🖥️ APP WINDOWS:
- **Faturação Hoje**: Deve mostrar **5.000 Kz**
- **Rendimento Global**: Deve mostrar **8.005.000 Kz** (8.000.000 + 5.000)
- **Console**: Deve mostrar logs de sincronização

#### 🌐 OWNER HUB (Web):
- **Faturação Hoje**: Deve mostrar **5.000 Kz**
- **Rendimento Global**: Deve mostrar **8.005.000 Kz**
- **Console**: Deve mostrar `[OWNER DASHBOARD] VALOR HOJE: 5000`

#### 🌐 ANALYTICS (Vercel):
- **Real-time metrics**: Deve mostrar **5.000 Kz** em vendas de hoje
- **Gráficos**: Devem atualizar automaticamente

### 3. 🎯 RESULTADOS ESPERADOS

```
📊 RESUMO ESPERADO:
├── Faturação Hoje: 5.000 Kz
├── Rendimento Global: 8.005.000 Kz
├── Histórico Fixo: 8.000.000 Kz
├── Soma Hoje: 5.000 Kz
└── Total: 8.005.000 Kz
```

### 4. 🔍 DIAGNÓSTICO DE ERROS

#### SE APP WINDOWS MOSTRAR 0:
- **Problema**: Fetch inicial não funcionou
- **Verificar**: Console deve mostrar `[APP] 🚀 Forçando fetch inicial do Supabase...`
- **Solução**: Reiniciar app e verificar `forceInitialSupabaseFetch()`

#### SE OWNER HUB MOSTRAR 0:
- **Problema**: Sincronização em tempo real falhando
- **Verificar**: Console deve mostrar `[OWNER DASHBOARD] 🔄 Mudança recebida na tabela orders`
- **Solução**: Verificar canal `orders_changes` no Supabase

#### SE RENDIMENTO GLOBAL FICAR EM 8.000.000:
- **Problema**: Cálculo não está somando vendas de hoje
- **Verificar**: Console deve mostrar `[GET_TODAY_REVENUE] 🔑 HISTÓRICO FIXO + SOMA HOJE:`
- **Solução**: Verificar constante `HISTORICO_FIXO = 8000000`

### 5. 📝 COMANDOS PARA DEBUG

#### NO CONSOLE DO APP WINDOWS:
```javascript
// Verificar estado atual
useStore.getState().activeOrders
useStore.getState().getTodayRevenue()

// Verificar histórico fixo
const HISTORICO_FIXO = 8000000;
console.log('Histórico Fixo:', HISTORICO_FIXO);

// Forçar recálculo
useStore.getState().getTodayRevenue().then(total => console.log('Total:', total));
```

#### NO CONSOLE DO OWNER HUB:
```javascript
// Verificar métricas
metrics.faturacaoHoje
metrics.rendimentoGlobal

// Forçar reload
fetchMetrics()
```

#### NO CONSOLE DO ANALYTICS:
```javascript
// Verificar métricas em tempo real
realMetrics.totalSalesToday
realtimeOrders.filter(o => o.status === 'closed')
```

---

## 🎯 VALIDAÇÃO FINAL

Após executar o teste:

### ✅ SUCESSO ESPERADO:
- [ ] App Windows mostra 5.000 Kz em "Faturação Hoje"
- [ ] App Windows mostra 8.005.000 Kz em "Rendimento Global"
- [ ] Owner Hub mostra 5.000 Kz em "Faturação Hoje"
- [ ] Owner Hub mostra 8.005.000 Kz em "Rendimento Global"
- [ ] Analytics mostra 5.000 Kz em vendas de hoje
- [ ] Console mostra logs de sincronização
- [ ] Não há erros de TypeScript

### 🚨 FALHA CRÍTICA:
- [ ] App Windows mostra 0 Kz
- [ ] Owner Hub mostra 0 Kz
- [ ] Rendimento Global fica em 8.000.000 Kz
- [ ] Console mostra erros de sincronização
- [ ] Analytics não atualiza

---

## 📞 SUPORTE

Se o teste falhar:
1. Capture screenshots dos consoles
2. Anote os valores mostrados em cada interface
3. Execute os comandos de debug acima
4. Verifique os logs do Supabase
5. Teste com diferentes navegadores

---

**🧪 Execute este teste para validar que toda a sincronização está 100% funcional!**
