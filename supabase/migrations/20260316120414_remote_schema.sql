create extension if not exists "pgjwt" with schema "extensions";

drop extension if exists "pg_net";

alter table "public"."expenses" drop constraint if exists "expenses_category_check";

-- expenses_pkey pode existir como constraint que referencia um index;
-- ao recriar a constraint/index, removemos primeiro a constraint para evitar erro 2BP01.
alter table "public"."expenses" drop constraint if exists "expenses_pkey";

drop index if exists "public"."expenses_pkey";

alter table "public"."app_settings" disable row level security;

alter table "public"."categories" disable row level security;

alter table "public"."customers" disable row level security;

alter table "public"."expenses" add column "category_name" text;

alter table "public"."expenses" add column "status" text default 'pago'::text;

alter table "public"."expenses" alter column "id" set data type text using "id"::text;

alter table "public"."external_history" disable row level security;

alter table "public"."order_items" disable row level security;

alter table "public"."orders" add column "invoice_number" text;

alter table "public"."orders" add column "table_id" uuid;

alter table "public"."products" add column "cost_price" numeric default 0;

alter table "public"."products" disable row level security;

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

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



create policy "image_upload 1ifhysk_0"
  on "storage"."objects"
  as permissive
  for insert
  to anon, authenticated, service_role
with check (true);



create policy "image_upload 1ifhysk_1"
  on "storage"."objects"
  as permissive
  for update
  to anon, authenticated, service_role
using (true);



create policy "image_upload 1ifhysk_2"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated, service_role
using (true);



create policy "image_upload 1ifhysk_3"
  on "storage"."objects"
  as permissive
  for delete
  to anon, authenticated, service_role
using (true);



