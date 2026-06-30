# Como Funciona o Card "FATURACAO ONTEM" (Apos Correcao)

## Diagrama do Fluxo Completo

```
+------------------------------------------------------------------+
|                    HORARIO ATUAL (Luanda)                          |
+------------------------------------------------------------------+
          |                          |
    00:00-04:59                   >= 05:00
    (Antes 05:00)                  (Apos 05:00)
          |                          |
          v                          v
+------------------------------------------------------------------+
|  USUARIO ABRE O DASHBOARD                                       |
+------------------------------------------------------------------+
          |                          |
          v                          v
+------------------------------------------------------------------+
|  VERIFICA CACHE NO localStorage                                  |
|                                                                  |
|  Chave: yesterdayRevenueV2_YYYY-MM-DD                           |
|  Chave: yesterdayRevenueOfficialV2_YYYY-MM-DD                    |
+------------------------------------------------------------------+
          |                          |
          v                          v
+------------------------------------------------------------------+
|  CASO 1: Antes das 05:00                                        |
|                                                                  |
|  Cache existe?                                                   |
|    - Sim, mas isOfficial=false (foi guardado ontem antes 05:00) |
|    - REGRA: So aceita cache se isOfficial=true                    |
|    - Entao: IGNORA CACHE, busca do Supabase                      |
|                                                                  |
|  Cache nao existe?                                               |
|    - Busca do Supabase                                           |
|                                                                  |
|  Resultado:                                                      |
|    - Valor = soma parcial das vendas ate agora                   |
|    - Badge = "EM ANDAMENTO" (amarelo)                            |
|    - Guarda no cache com isOfficial=false                        |
|    - Card pode mudar se recarregar a pagina                      |
+------------------------------------------------------------------+
          |                          |
          v                          v
+------------------------------------------------------------------+
|  CASO 2: Apos as 05:00                                          |
|                                                                  |
|  Cache existe com isOfficial=true?                                 |
|    - Sim: Usa o cache (valor trava, nao muda mais)              |
|    - Nao: Busca do Supabase, calcula total oficial               |
|                                                                  |
|  Resultado:                                                      |
|    - Valor = total completo do dia operacional                   |
|    - Badge = "OFICIAL" (laranja)                                  |
|    - Guarda no cache com isOfficial=true                         |
|    - Card NAO muda ate ao proximo dia as 05:00                   |
+------------------------------------------------------------------+
```

## Regra de Ouro

```
if (cache existe && cache.isOfficial === true) {
    // Usa cache — valor TRAVADO
    mostrarValorCache();
    return;
} else {
    // Busca do Supabase — valor pode mudar
    buscarDoSupabase();
    calcularTotal();
    guardarNoCache();
}
```

## Cenarios do Dia

### CENARIO A: 03:00 da madrugada (antes das 05:00)

```
Hora: 03:00
Dia operacional: AINDA NAO ACABOU (vai ate 04:59)
Acao: Busca do Supabase
Cache: Guarda como PARCIAL (isOfficial=false)
Badge: "EM ANDAMENTO" (amarelo)
Valor: Soma ate agora (ainda pode aumentar)
```

### CENARIO B: 10:00 da manha (apos as 05:00)

```
Hora: 10:00
Dia operacional: JA ACABOU (acabou as 04:59)
Acao: Verifica cache
  - Se cache existir com isOfficial=true → USA CACHE
  - Se cache existir com isOfficial=false → IGNORA, busca Supabase
  - Se nao houver cache → Busca Supabase

Cache: Guarda como OFICIAL (isOfficial=true)
Badge: "OFICIAL" (laranja)
Valor: Total completo do dia (NAO muda mais)
```

### CENARIO C: 15:00 da tarde (apos as 05:00, cache ja existe)

```
Hora: 15:00
Dia operacional: JA ACABOU
Acao: Verifica cache
Cache: isOfficial=true → USA CACHE
Badge: "OFICIAL" (laranja)
Valor: O MESMO de manha (NAO muda!)
```

### CENARIO D: Novo dia, 02:00 da madrugada

```
Hora: 02:00
Dia operacional: Ontem ainda NAO acabou (vai ate 04:59 de hoje)
Acao: Busca do Supabase
Cache: Chave e yesterdayRevenueV2_2026-06-15 (novo dia)
  - Nao existe ainda, entao busca do Supabase
Badge: "EM ANDAMENTO" (amarelo)
Valor: Soma parcial de ontem (que ainda e "hoje" no dia operacional)
```

## Estrutura do Cache no localStorage

```
Key:   yesterdayRevenueV2_2026-06-14
Value: "203600"                    <- valor em Kz

Key:   yesterdayRevenueOfficialV2_2026-06-14
Value: "true"  ou  "false"        <- se e oficial ou parcial
```

## Por que a correcao funcionou?

### ANTES (com BUG):
```typescript
if (cached) {           // <- Qualquer cache serve!
    usaCache();         //    Mesmo que seja parcial!
    return;             //    Nunca atualiza apos 05:00!
}
```

**Problema**: Se o user abria a app as 03:00, guardava valor parcial. As 10:00, o cache ainda existia e usava o valor parcial. **Nunca atualizava!**

### DEPOIS (corrigido):
```typescript
if (cached && cachedOfficial === 'true') {  // <- So cache OFICIAL!
    usaCache();                              //    Seguro usar
    return;
}
// Se chegou aqui, cache e parcial ou nao existe
// Busca do Supabase e atualiza
```

**Correcao**: So aceita cache se for oficial (apos 05:00). Cache parcial e ignorado e recalculado.

## Resumo em uma frase

> **O valor so trava (nao muda) quando o cache e criado apos as 05:00. Antes disso, sempre busca do Supabase.**
