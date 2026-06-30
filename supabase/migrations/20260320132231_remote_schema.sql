drop trigger if exists "update_business_stats_updated_at" on "public"."business_stats";

drop trigger if exists "update_categories_updated_at" on "public"."categories";

drop trigger if exists "update_expenses_updated_at" on "public"."expenses";

drop trigger if exists "update_order_items_updated_at" on "public"."order_items";

drop trigger if exists "update_orders_updated_at" on "public"."orders";

drop trigger if exists "update_products_updated_at" on "public"."products";

drop trigger if exists "set_purchase_approval_token" on "public"."purchase_requests";

drop trigger if exists "set_timestamp" on "public"."salary_payments";

drop policy if exists "Authenticated users can delete order items" on "public"."order_items";

drop policy if exists "Authenticated users can insert order items" on "public"."order_items";

drop policy if exists "Authenticated users can update order items" on "public"."order_items";

alter table "public"."order_items" drop constraint if exists "fk_order_items_order";

alter table "public"."order_items" drop constraint if exists "fk_order_items_product";

alter table "public"."order_items" drop constraint if exists "order_items_order_id_fkey";

alter table "public"."order_items" drop constraint if exists "order_items_product_id_fkey";

alter table "public"."products" drop constraint if exists "products_category_id_fkey";

alter table "public"."salary_payments" drop constraint if exists "salary_payments_staff_id_fkey";

alter table "public"."staff_schedules" drop constraint if exists "staff_schedules_staff_id_fkey";

drop view if exists "public"."dashboard_stats_v2";

drop view if exists "public"."dishes";


  create table "public"."financial_history" (
    "id" uuid not null default gen_random_uuid(),
    "amount" numeric(15,2) not null,
    "description" text,
    "transaction_date" timestamp with time zone not null,
    "transaction_type" character varying(50) not null,
    "category" character varying(100),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."financial_history" enable row level security;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'orders' and column_name = 'customer_id') then
    alter table "public"."orders" add column "customer_id" uuid;
  end if;
end $$;

alter table "public"."pos_tables" alter column "id" set default nextval('public.pos_tables_id_seq'::regclass);

CREATE UNIQUE INDEX financial_history_pkey ON public.financial_history USING btree (id);

CREATE INDEX idx_financial_history_transaction_date ON public.financial_history USING btree (transaction_date);

CREATE INDEX idx_financial_history_transaction_type ON public.financial_history USING btree (transaction_type);

alter table "public"."expenses" drop constraint if exists "expenses_pkey";

DROP INDEX IF EXISTS public.expenses_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS expenses_pkey ON public.expenses USING btree (id);

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."financial_history" add constraint "financial_history_pkey" PRIMARY KEY using index "financial_history_pkey";

alter table "public"."order_items" add constraint "fk_order_items_order" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "fk_order_items_order";

alter table "public"."order_items" add constraint "fk_order_items_product" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "fk_order_items_product";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) not valid;

alter table "public"."products" validate constraint "products_category_id_fkey";

alter table "public"."salary_payments" add constraint "salary_payments_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE not valid;

alter table "public"."salary_payments" validate constraint "salary_payments_staff_id_fkey";

alter table "public"."staff_schedules" add constraint "staff_schedules_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE not valid;

alter table "public"."staff_schedules" validate constraint "staff_schedules_staff_id_fkey";

-- Criar função get_dashboard_metrics se não existir
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_period TEXT DEFAULT 'HOJE',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_revenue NUMERIC DEFAULT 0;
  v_expenses NUMERIC DEFAULT 0;
  v_orders_count INTEGER DEFAULT 0;
BEGIN
  -- Definir datas baseadas no período
  IF p_period = 'HOJE' THEN
    v_start_date := CURRENT_DATE;
    v_end_date := CURRENT_DATE;
  ELSIF p_period = 'SEMANA' THEN
    v_start_date := CURRENT_DATE - INTERVAL '7 days';
    v_end_date := CURRENT_DATE;
  ELSIF p_period = 'MÊS' THEN
    v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_end_date := CURRENT_DATE;
  ELSIF p_period = 'ANO' THEN
    v_start_date := DATE_TRUNC('year', CURRENT_DATE)::DATE;
    v_end_date := CURRENT_DATE;
  ELSE
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  END IF;

  -- Calcular revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue
  FROM orders
  WHERE status IN ('closed', 'paid', 'completed')
    AND DATE(created_at) BETWEEN v_start_date AND v_end_date;

  -- Calcular expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM expenses
  WHERE DATE(created_at) BETWEEN v_start_date AND v_end_date;

  -- Contar orders
  SELECT COUNT(*) INTO v_orders_count
  FROM orders
  WHERE status IN ('closed', 'paid', 'completed')
    AND DATE(created_at) BETWEEN v_start_date AND v_end_date;

  RETURN json_build_object(
    'revenue', v_revenue,
    'expenses', v_expenses,
    'orders_count', v_orders_count,
    'period', p_period,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$$;

create or replace view "public"."dashboard_metrics_view" as  SELECT public.get_dashboard_metrics('HOJE'::text) AS hoje,
    public.get_dashboard_metrics('SEMANA'::text) AS semana,
    public.get_dashboard_metrics('MÊS'::text) AS mes,
    public.get_dashboard_metrics('ANO'::text) AS ano;


create or replace view "public"."dashboard_stats_v2" as  SELECT id AS order_id,
    total_amount,
    payment_method,
    created_at,
    ( SELECT sum(((oi.quantity)::numeric * p.cost_price)) AS sum
           FROM (public.order_items oi
             JOIN public.products p ON ((oi.product_id = p.id)))
          WHERE (oi.order_id = o.id)) AS total_cost
   FROM public.orders o
  WHERE (status = 'closed'::text);


create or replace view "public"."dishes" as  SELECT id,
    name,
    COALESCE(price, (0)::numeric) AS price,
    COALESCE(cost_price, (0)::numeric) AS cost_price,
    category_id,
    COALESCE(description, ''::text) AS description,
    image_url AS image,
    COALESCE(is_active, true) AS is_visible_digital,
    false AS is_featured
   FROM public.products;


grant delete on table "public"."financial_history" to "anon";

grant insert on table "public"."financial_history" to "anon";

grant references on table "public"."financial_history" to "anon";

grant select on table "public"."financial_history" to "anon";

grant trigger on table "public"."financial_history" to "anon";

grant truncate on table "public"."financial_history" to "anon";

grant update on table "public"."financial_history" to "anon";

grant delete on table "public"."financial_history" to "authenticated";

grant insert on table "public"."financial_history" to "authenticated";

grant references on table "public"."financial_history" to "authenticated";

grant select on table "public"."financial_history" to "authenticated";

grant trigger on table "public"."financial_history" to "authenticated";

grant truncate on table "public"."financial_history" to "authenticated";

grant update on table "public"."financial_history" to "authenticated";

grant delete on table "public"."financial_history" to "service_role";

grant insert on table "public"."financial_history" to "service_role";

grant references on table "public"."financial_history" to "service_role";

grant select on table "public"."financial_history" to "service_role";

grant trigger on table "public"."financial_history" to "service_role";

grant truncate on table "public"."financial_history" to "service_role";

grant update on table "public"."financial_history" to "service_role";


  create policy "Users can delete financial history"
  on "public"."financial_history"
  as permissive
  for delete
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users can insert financial history"
  on "public"."financial_history"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Users can update financial history"
  on "public"."financial_history"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users can view financial history"
  on "public"."financial_history"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users can select order items"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can delete order items"
  on "public"."order_items"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can insert order items"
  on "public"."order_items"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can update order items"
  on "public"."order_items"
  as permissive
  for update
  to authenticated
using (true);

-- Criar função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar função set_approval_token se não existir
CREATE OR REPLACE FUNCTION set_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  NEW.approval_token = encode(gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar função trigger_set_timestamp se não existir
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER update_business_stats_updated_at BEFORE UPDATE ON public.business_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_purchase_approval_token BEFORE INSERT ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.set_approval_token();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.salary_payments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

drop policy "image_upload 1ifhysk_0" on "storage"."objects";

drop policy "image_upload 1ifhysk_1" on "storage"."objects";

drop policy "image_upload 1ifhysk_2" on "storage"."objects";

drop policy "image_upload 1ifhysk_3" on "storage"."objects";


  create policy "image_upload 1ifhysk_0"
  on "storage"."objects"
  as permissive
  for insert
  to anon, authenticated, service_role, cli_login_postgres
with check (true);



  create policy "image_upload 1ifhysk_1"
  on "storage"."objects"
  as permissive
  for update
  to anon, authenticated, service_role, cli_login_postgres
using (true);



  create policy "image_upload 1ifhysk_2"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated, service_role, cli_login_postgres
using (true);



  create policy "image_upload 1ifhysk_3"
  on "storage"."objects"
  as permissive
  for delete
  to anon, authenticated, service_role, cli_login_postgres
using (true);



