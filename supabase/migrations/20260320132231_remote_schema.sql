drop trigger if exists "update_business_stats_updated_at" on "public"."business_stats";

drop trigger if exists "update_categories_updated_at" on "public"."categories";

drop trigger if exists "update_expenses_updated_at" on "public"."expenses";

drop trigger if exists "update_order_items_updated_at" on "public"."order_items";

drop trigger if exists "update_orders_updated_at" on "public"."orders";

drop trigger if exists "update_products_updated_at" on "public"."products";

drop trigger if exists "set_purchase_approval_token" on "public"."purchase_requests";

drop trigger if exists "set_timestamp" on "public"."salary_payments";

drop policy "Authenticated users can delete order items" on "public"."order_items";

drop policy "Authenticated users can insert order items" on "public"."order_items";

drop policy "Authenticated users can update order items" on "public"."order_items";

alter table "public"."order_items" drop constraint "fk_order_items_order";

alter table "public"."order_items" drop constraint "fk_order_items_product";

alter table "public"."order_items" drop constraint "order_items_order_id_fkey";

alter table "public"."order_items" drop constraint "order_items_product_id_fkey";

alter table "public"."products" drop constraint "products_category_id_fkey";

alter table "public"."salary_payments" drop constraint "salary_payments_staff_id_fkey";

alter table "public"."staff_schedules" drop constraint "staff_schedules_staff_id_fkey";

drop view if exists "public"."dashboard_stats_v2";

drop view if exists "public"."dishes";

drop index if exists "public"."expenses_pkey";


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

alter table "public"."orders" add column "customer_id" uuid;

alter table "public"."pos_tables" alter column "id" set default nextval('public.pos_tables_id_seq'::regclass);

CREATE UNIQUE INDEX financial_history_pkey ON public.financial_history USING btree (id);

CREATE INDEX idx_financial_history_transaction_date ON public.financial_history USING btree (transaction_date);

CREATE INDEX idx_financial_history_transaction_type ON public.financial_history USING btree (transaction_type);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

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



