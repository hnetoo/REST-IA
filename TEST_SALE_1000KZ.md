# 🧪 TESTE DE VENDA - 1.000 Kz

## 📋 INSTRUÇÕES PARA TESTE DE SINCRONIZAÇÃO

### 1. 🧪 FAZER VENDA DE TESTE
1. Abra a app Windows (Terminal POS)
2. Selecione qualquer mesa
3. Adicione um produto com valor **exato de 1.000 Kz**
4. Feche a venda com qualquer método de pagamento
5. Anote o ID da ordem criada

### 2. 📊 VERIFICAÇÃO INSTANTÂNEA

#### 🖥️ DASHBOARD APP WINDOWS
- Deve mostrar **1.000 Kz** no card "Faturação Hoje"
- Console deve mostrar: `[SYNC ORDER] 🚀 Sincronizando venda com Supabase...`
- Console deve mostrar: `[SYNC ORDER] ✅ Venda sincronizada com Supabase`

#### 🌐 OWNER HUB (Web)
- Deve mostrar **1.000 Kz** no card "Faturação Hoje"
- Console deve mostrar: `[OWNER DASHBOARD] VALOR HOJE: 1000`
- Console deve mostrar: `[OWNER DASHBOARD] HISTÓRICO LEGADO: 8000000`

### 3. 🔍 DIAGNÓSTICO DE ERROS

#### SE APP WINDOWS MOSTRAR 0 E OWNER HUB MOSTRAR 1.000:
- **Problema**: Filtro de status diferente
- **Verificar**: Função `getTodaySalesTotal()` no useStore
- **Solução**: Unificar status `['closed', 'FECHADO', 'paid', 'pago', 'finalized']`

#### SE APP WINDOWS MOSTRAR 1.000 E OWNER HUB MOSTRAR 0:
- **Problema**: Owner Hub não está lendo do Supabase
- **Verificar**: Função `fetchMetrics()` no OwnerDashboard
- **Solução**: Garantir leitura da tabela `orders` do Supabase

#### SE AMBOS MOSTRAREM 0:
- **Problema**: Sincronização com Supabase falhando
- **Verificar**: Conexão com Supabase e função `syncOrderToSupabase()`
- **Solução**: Verificar se `navigator.onLine` está funcionando

### 4. 📝 COMANDOS PARA DEBUG

#### NO CONSOLE DO APP WINDOWS:
```javascript
// Verificar estado atual
useStore.getState().activeOrders
useStore.getState().getTodaySalesTotal()

// Forçar sincronização manual
useStore.getState().fetchOrders()

// Verificar conexão
navigator.onLine
```

#### NO CONSOLE DO OWNER HUB:
```javascript
// Verificar métricas
metrics.faturacaoHoje
metrics.rendimentoGlobal

// Forçar reload
fetchMetrics()
```

---

## 🎯 RESULTADO ESPERADO

Após teste bem-sucedido:
- ✅ App Windows: 1.000 Kz
- ✅ Owner Hub: 1.000 Kz  
- ✅ Supabase: Venda registrada
- ✅ Sincronização: Instantânea
- ✅ Filtros: Unificados

## 🚨 EM CASO DE FALHA

1. Execute limpeza: `WINDOWS_DATA_CLEANUP.bat`
2. Reabra ambas as aplicações
3. Repita o teste
4. Se persistir, verifique logs no console

---

## 📞 SUPORTE

Se o problema persistir:
1. Capture screenshots dos consoles
2. Anote os valores mostrados
3. Verifique o ID da ordem criada
4. Execute os comandos de debug acima
