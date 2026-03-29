# 🔑 SUPER VIEW - final_business_summary

## ✅ Schema Analisado e SQL Criado

### 📋 **NOMES REAIS DAS COLUNAS:**

#### 🏛️ **external_history:**
```sql
id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
source_name   String
total_revenue Decimal   @default(0) @db.Decimal
gross_profit  Decimal   @default(0) @db.Decimal
period        String
created_at    DateTime? @default(now()) @db.Timestamptz(6)
updated_at    DateTime? @default(now()) @db.Timestamptz(6)
```

#### 🛒️ **orders:**
```sql
id               String        @id @default(dbgenerated("gen_random_uuid()"))
customer_name    String?
customer_phone   String?
delivery_address String?
total_amount     Decimal?      @db.Decimal(10, 2)
status           String?       @default("pending")
created_at       DateTime?     @default(now()) @db.Timestamptz(6)
updated_at       DateTime?     @default(now()) @db.Timestamptz(6)
cost_amount      Decimal?      @default(0) @db.Decimal(15, 2)
payment_method   String?       @default("NUMERARIO")
invoice_number   String?
table_id         String?       @db.Uuid
customer_id      String?       @db.Uuid
user_id          String?       @db.Uuid
order_items      order_items[]
```

#### 📦 **order_items:**
```sql
id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
order_id    String
product_id  String    @db.Uuid
quantity    Int       @default(1)
unit_price  Decimal   @db.Decimal(10, 2)
total_price Decimal   @db.Decimal(10, 2)
created_at  DateTime? @default(now()) @db.Timestamptz(6)
updated_at  DateTime? @default(now()) @db.Timestamptz(6)
```

#### 📦 **products:**
```sql
id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
name        String
price       Decimal       @db.Decimal(10, 2)
image_url   String?
is_active   Boolean?      @default(true)
category_id String        @db.Uuid
created_at  DateTime?     @default(now()) @db.Timestamptz(6)
updated_at  DateTime?     @default(now()) @db.Timestamptz(6)
cost_price  Decimal?      @default(0) @db.Decimal
description String?
```

#### 💰 **expenses:**
```sql
id            String    @id @default(dbgenerated("gen_random_uuid()"))
description   String
amount_kz     Decimal   @db.Decimal(15, 2)
category      String
is_recurring  Boolean?  @default(false)
period_start  DateTime? @db.Date
period_end    DateTime? @db.Date
created_at    DateTime? @default(now()) @db.Timestamptz(6)
updated_at    DateTime? @default(now()) @db.Timestamptz(6)
status        String?   @default("pago")
category_name String?
```

#### 👥 **staff:**
```sql
id              String            @id @default(dbgenerated("gen_random_uuid()"))
full_name       String
role            String?
base_salary_kz  Decimal?          @default(0) @db.Decimal(12, 2)
phone           String?
status          String?           @default("active")
created_at      DateTime?         @default(now()) @db.Timestamptz(6)
subsidios       Decimal?          @default(0) @db.Decimal
bonus           Decimal?          @default(0) @db.Decimal
horas_extras    Decimal?          @default(0) @db.Decimal
descontos       Decimal?          @default(0) @db.Decimal
salario_base    Decimal?          @default(0) @db.Decimal
salary_payments salary_payments[]
staff_schedules staff_schedules[]
```

---

## 🎯 **SUPER VIEW CRIADA:**

### 📊 **final_business_summary:**
```sql
CREATE OR REPLACE VIEW final_business_summary AS
WITH 
-- 1. Histórico Externo (8M fixo)
external_history AS (
    SELECT 
        COALESCE(SUM(total_revenue), 0) as total_historico,
        'Histórico Externo' as fonte
    FROM external_history
),

-- 2. Vendas Totais (com JOIN para obter custos dos produtos)
orders_summary AS (
    SELECT 
        COALESCE(SUM(o.total_amount), 0) as total_vendas,
        COALESCE(SUM(
            (oi.quantity * (p.price - COALESCE(p.cost_price, 0)))
        ), 0) as total_custos_produtos,
        'Vendas' as fonte
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'closed'
),

-- 3. Despesas Totais
expenses_summary AS (
    SELECT 
        COALESCE(SUM(amount_kz), 0) as total_despesas,
        'Despesas' as fonte
    FROM expenses
    WHERE status = 'pago'
),

-- 4. Salários Totais
staff_summary AS (
    SELECT 
        COALESCE(SUM(base_salary_kz), 0) as total_salarios,
        'Salários' as fonte
    FROM staff
    WHERE status = 'active'
)

-- 5. Combinação Final
SELECT 
    -- Valores Base
    eh.total_historico,
    os.total_vendas,
    os.total_custos_produtos,
    es.total_despesas,
    ss.total_salarios,
    
    -- Cálculos Financeiros
    (eh.total_historico + os.total_vendas) as faturacao_total,
    (os.total_custos_produtos + es.total_despesas + ss.total_salarios) as custos_totais,
    (eh.total_historico + os.total_vendas - os.total_custos_produtos - es.total_despesas - ss.total_salarios) as lucro_liquido,
    
    -- Métricas Adicionais
    CASE 
        WHEN (eh.total_historico + os.total_vendas) > 0 
        THEN ROUND(((eh.total_historico + os.total_vendas - os.total_custos_produtos - es.total_despesas - ss.total_salarios) / (eh.total_historico + os.total_vendas)) * 100, 2)
        ELSE 0 
    END as margem_lucro_percentagem,
    
    -- Metadados
    CURRENT_TIMESTAMP as data_ultima_atualizacao,
    'GMT+1 (Angola)' as fuso_horario

FROM external_history eh
CROSS JOIN orders_summary os
CROSS JOIN expenses_summary es
CROSS JOIN staff_summary ss;
```

---

## 🎯 **ESTRUTURA DA VIEW:**

### 📋 **COLUNAS PRINCIPAIS:**
- **total_historico**: 8.000.000 Kz (external_history.total_revenue)
- **total_vendas**: Soma de orders.total_amount (status = 'closed')
- **total_custos_produtos**: Soma de (order_items.quantity * (products.price - products.cost_price))
- **total_despesas**: Soma de expenses.amount_kz (status = 'pago')
- **total_salarios**: Soma de staff.base_salary_kz (status = 'active')

### 🧮 **CÁLCULOS:**
- **faturacao_total** = total_historico + total_vendas
- **custos_totais** = total_custos_produtos + total_despesas + total_salarios
- **lucro_liquido** = faturacao_total - custos_totais
- **margem_lucro_percentagem** = (lucro_liquido / faturacao_total) * 100

### 🕐 **METADADOS:**
- **data_ultima_atualizacao**: Timestamp em tempo real
- **fuso_horario**: GMT+1 (Angola)

---

## 📋 **USO NO DASHBOARD:**

```sql
-- Para obter os dados consolidados:
SELECT * FROM final_business_summary ORDER BY data_ultima_atualizacao DESC LIMIT 1;

-- Para obter histórico:
SELECT * FROM final_business_summary ORDER BY data_ultima_atualizacao DESC;
```

---

## ✅ **PRÓXIMOS PASSOS:**

1. **Executar SQL no Supabase**:
   ```sql
   -- Copiar e colar no SQL Editor do Supabase
   -- Ou executar via psql se tiver acesso direto
   ```

2. **Atualizar Dashboard** para ler da nova view:
   ```typescript
   // Em vez de múltiplas queries, usar apenas:
   const { data } = await supabase
     .from('final_business_summary')
     .select('*')
     .order('data_ultima_atualizacao', { ascending: false })
     .limit(1);
   ```

3. **Formatar como Kz**:
   ```typescript
   const formatKz = (val: number) => 
     new Intl.NumberFormat('pt-AO', { 
       style: 'currency', 
       currency: 'AOA', 
       maximumFractionDigits: 0 
     }).format(val);
   ```

---

## 🎯 **RESULTADO ESPERADO:**

### ✅ **Dashboard Verdadeiro:**
- **Rendimento Global**: 8.000.000 + vendas_reais
- **Faturação Total**: total_historico + total_vendas
- **Lucro Operacional**: faturacao_total - custos_totais
- **Margem de Lucro**: margem_lucro_percentagem%

### ✅ **Staff Corrigido:**
- **Insert no Supabase** acontece antes de mostrar na UI
- **Validação de conexão** antes de qualquer gravação
- **Confirmação visual** só se sucesso no Supabase

### ✅ **Moeda e Fuso:**
- **Valores em Kz** (Kwanza)
- **Fuso GMT+1** (Angola)
- **Timestamp em tempo real**

---

**🔑 SUPER VIEW CRIADA COM NOMES REAIS DAS COLUNAS! Pronta para executar no Supabase.**
