


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."PaymentMethod" AS ENUM (
    'NUMERARIO',
    'TPA',
    'QRCODE',
    'TRANSFERENCIA'
);


ALTER TYPE "public"."PaymentMethod" OWNER TO "postgres";


CREATE TYPE "public"."consumptiontype" AS ENUM (
    'ILIMITADO',
    'LIMITADO',
    'PACOTE_FECHADO',
    'CONSUMO_POS'
);


ALTER TYPE "public"."consumptiontype" OWNER TO "postgres";


CREATE TYPE "public"."eventarea" AS ENUM (
    'SALA_PRINCIPAL',
    'TERRACO',
    'SALAO_PRIVADO',
    'RESTAURANTE_INTEIRO'
);


ALTER TYPE "public"."eventarea" OWNER TO "postgres";


CREATE TYPE "public"."eventordertype" AS ENUM (
    'INCLUIDO',
    'EXTRA'
);


ALTER TYPE "public"."eventordertype" OWNER TO "postgres";


CREATE TYPE "public"."eventstatus" AS ENUM (
    'PLANEADO',
    'CONFIRMADO',
    'EM_ANDAMENTO',
    'CONCLUIDO',
    'CANCELADO'
);


ALTER TYPE "public"."eventstatus" OWNER TO "postgres";


CREATE TYPE "public"."eventtype" AS ENUM (
    'ANIVERSARIO',
    'CASAMENTO',
    'ALUGUER_TOTAL',
    'ALUGUER_PARCIAL',
    'SHOW_INTIMISTA',
    'CORPORATIVO',
    'BATIZADO',
    'OUTRO'
);


ALTER TYPE "public"."eventtype" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_old_audit_logs"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    INSERT INTO audit_logs_archive (
        id, user_id, user_name, action, module, 
        entity_type, entity_id, old_values, new_values,
        ip_address, user_agent, timestamp
    )
    SELECT 
        id, user_id, user_name, action, module,
        entity_type, entity_id, old_values, new_values,
        ip_address, user_agent, timestamp
    FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    RETURN jsonb_build_object(
        'success', true,
        'archived_rows', archived_count,
        'message', format('%s logs arquivados e removidos da tabela principal', archived_count)
    );
END;
$$;


ALTER FUNCTION "public"."archive_old_audit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_old_audit_logs"() IS 'Arquiva logs de auditoria com mais de 90 dias para audit_logs_archive. Executar via cron mensal.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_active_orders"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_orders
    WHERE updated_at < NOW() - INTERVAL '24 hours'
      AND status != 'ABERTO';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_rows', deleted_count,
        'message', format('%s contas antigas limpas', deleted_count)
    );
END;
$$;


ALTER FUNCTION "public"."cleanup_old_active_orders"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_active_orders"() IS 'Limpa contas abertas antigas (mais de 24 horas e nao estao ABERTO). Executar via cron a cada hora.';



CREATE OR REPLACE FUNCTION "public"."delete_active_order"("p_local_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM active_orders WHERE local_id = p_local_id;
  RETURN jsonb_build_object('success', true, 'message', 'Conta aberta removida');
END;
$$;


ALTER FUNCTION "public"."delete_active_order"("p_local_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_active_order"("p_local_id" "text") IS 'RPC para deletar conta aberta quando fechada.';



CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  EXECUTE sql;
END;
$$;


ALTER FUNCTION "public"."exec_sql"("sql" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_orders"("p_device_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_orders JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'local_id', local_id,
      'table_id', table_id,
      'type', type,
      'status', status,
      'items', items,
      'total', total,
      'tax_total', tax_total,
      'profit', profit,
      'sub_account_name', sub_account_name,
      'timestamp', timestamp
    )
  ) INTO v_orders
  FROM active_orders
  WHERE (p_device_id IS NULL OR device_id = p_device_id)
    AND status = 'ABERTO'
    AND updated_at > NOW() - INTERVAL '24 hours'; -- Apenas últimas 24 horas
  
  RETURN jsonb_build_object('success', true, 'orders', COALESCE(v_orders, '[]'::jsonb));
END;
$$;


ALTER FUNCTION "public"."get_active_orders"("p_device_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_orders"("p_device_id" "text") IS 'RPC para recuperar contas abertas do Supabase.';



CREATE OR REPLACE FUNCTION "public"."get_closed_days_safe"() RETURNS TABLE("date" "date")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT date FROM public.closed_days ORDER BY date DESC;
$$;


ALTER FUNCTION "public"."get_closed_days_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_metrics"("p_period" "text" DEFAULT 'HOJE'::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_dashboard_metrics"("p_period" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_database_size_stats"() RETURNS TABLE("table_name" "text", "row_count" bigint, "size_pretty" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text,
        (SELECT COUNT(*) FROM pg_class c 
         JOIN pg_namespace n ON n.oid = c.relnamespace 
         WHERE n.nspname = 'public' AND c.relname = t.tablename)::bigint,
        pg_size_pretty(pg_total_relation_size('public.' || t.tablename))::text
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size('public.' || t.tablename) DESC;
END;
$$;


ALTER FUNCTION "public"."get_database_size_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_database_size_stats"() IS 'Retorna estatisticas de tamanho de todas as tabelas publicas.';



CREATE OR REPLACE FUNCTION "public"."log_data_contabil_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    -- Só logar se data_contabil mudou
    IF OLD.data_contabil IS DISTINCT FROM NEW.data_contabil THEN
        -- Tentar inserir no log, mas ignorar erro se ID não for UUID válido
        BEGIN
            INSERT INTO data_contabil_audit_log (
                table_name,
                record_id,
                old_value,
                new_value,
                changed_by,
                change_reason,
                is_manual
            ) VALUES (
                TG_TABLE_NAME,
                CASE 
                    WHEN NEW.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN NEW.id::UUID 
                    ELSE NULL 
                END,
                OLD.data_contabil,
                NEW.data_contabil,
                current_user,
                'Mudança de data_contabil',
                true
            );
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar erro de conversão UUID e continuar
            NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."log_data_contabil_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_invoice_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, user_name, action, module, entity_type, entity_id, new_values)
    VALUES (
      'SYSTEM',
      'System',
      'CREATE_INVOICE',
      'INVOICE',
      'INVOICE',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, user_name, action, module, entity_type, entity_id, old_values, new_values)
    VALUES (
      'SYSTEM',
      'System',
      'UPDATE_INVOICE',
      'INVOICE',
      'INVOICE',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, user_name, action, module, entity_type, entity_id, old_values)
    VALUES (
      'SYSTEM',
      'System',
      'DELETE_INVOICE',
      'INVOICE',
      'INVOICE',
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_invoice_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_day_closed_safe"("p_date" "date") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  INSERT INTO public.closed_days (date) 
  VALUES (p_date) 
  ON CONFLICT (date) DO NOTHING;
$$;


ALTER FUNCTION "public"."mark_day_closed_safe"("p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_stock_movement_on_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'FECHADO' AND OLD.status != 'FECHADO' THEN
    -- Registar movimento de stock para cada item
    INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, user_id, notes)
    SELECT 
      item->>'dishId' as product_id,
      'SAIDA' as movement_type,
      -(item->>'quantity')::INTEGER as quantity,
      'INVOICE' as reference_type,
      NEW.invoice_number as reference_id,
      0 as previous_quantity, -- Será atualizado pelo trigger
      0 as new_quantity, -- Será atualizado pelo trigger
      'SYSTEM' as user_id,
      'Venda automatica' as notes
    FROM jsonb_array_elements(NEW.items) as item;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."register_stock_movement_on_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_day_closed_safe"("p_date" "date") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DELETE FROM public.closed_days WHERE date = p_date;
$$;


ALTER FUNCTION "public"."remove_day_closed_safe"("p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_active_order"("p_local_id" "text", "p_table_id" integer, "p_type" "text", "p_status" "text", "p_items" "jsonb", "p_total" numeric, "p_tax_total" numeric, "p_profit" numeric, "p_sub_account_name" "text", "p_device_id" "text", "p_session_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO active_orders (
    local_id, table_id, type, status, items, total, tax_total, profit,
    sub_account_name, device_id, session_id
  ) VALUES (
    p_local_id, p_table_id, p_type, p_status, p_items, p_total, p_tax_total, p_profit,
    p_sub_account_name, p_device_id, p_session_id
  )
  ON CONFLICT (local_id)
  DO UPDATE SET
    table_id = EXCLUDED.table_id,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    items = EXCLUDED.items,
    total = EXCLUDED.total,
    tax_total = EXCLUDED.tax_total,
    profit = EXCLUDED.profit,
    sub_account_name = EXCLUDED.sub_account_name,
    updated_at = NOW()
  WHERE active_orders.local_id = save_active_order.p_local_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Conta aberta salva');
END;
$$;


ALTER FUNCTION "public"."save_active_order"("p_local_id" "text", "p_table_id" integer, "p_type" "text", "p_status" "text", "p_items" "jsonb", "p_total" numeric, "p_tax_total" numeric, "p_profit" numeric, "p_sub_account_name" "text", "p_device_id" "text", "p_session_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_active_order"("p_local_id" "text", "p_table_id" integer, "p_type" "text", "p_status" "text", "p_items" "jsonb", "p_total" numeric, "p_tax_total" numeric, "p_profit" numeric, "p_sub_account_name" "text", "p_device_id" "text", "p_session_id" "text") IS 'RPC para salvar/atualizar conta aberta no Supabase.';



CREATE OR REPLACE FUNCTION "public"."set_approval_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.approval_token = encode(gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_approval_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_complete_order"("order_data" "jsonb", "items_data" "jsonb"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Inserir ou atualizar a order
  INSERT INTO orders SELECT * FROM jsonb_populate_record(NULL::orders, order_data)
  ON CONFLICT (id) DO UPDATE SET 
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    payment_method = EXCLUDED.payment_method,
    invoice_number = EXCLUDED.invoice_number,
    customer_id = EXCLUDED.customer_id,
    table_id = EXCLUDED.table_id,
    updated_at = now();

  -- Inserir os order_items (não atualiza se já existirem)
  INSERT INTO order_items SELECT * FROM jsonb_to_recordset(items_data) AS i(
    id UUID,
    order_id UUID,
    dish_id UUID,
    dish_name TEXT,
    quantity INTEGER,
    unit_price DECIMAL,
    total_price DECIMAL
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."sync_complete_order"("order_data" "jsonb", "items_data" "jsonb"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_active_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_active_orders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_data_contabil_manual"("p_table_name" "text", "p_record_id" "uuid", "p_new_data_contabil" "date", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_value DATE;
BEGIN
  IF p_table_name = 'orders' THEN
    SELECT data_contabil INTO v_old_value FROM orders WHERE id = p_record_id;
    UPDATE orders SET data_contabil = p_new_data_contabil, updated_at = NOW() WHERE id = p_record_id;
  ELSIF p_table_name = 'cash_flow' THEN
    SELECT data_contabil INTO v_old_value FROM cash_flow WHERE id = p_record_id;
    UPDATE cash_flow SET data_contabil = p_new_data_contabil, updated_at = NOW() WHERE id = p_record_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tabela não suportada');
  END IF;
  
  INSERT INTO data_contabil_audit_log (table_name, record_id, old_value, new_value, changed_by, change_reason, is_manual)
  VALUES (p_table_name, p_record_id, v_old_value, p_new_data_contabil, current_user, COALESCE(p_reason, 'Manual'), true);
  
  RETURN jsonb_build_object('success', true, 'message', 'Atualizado', 'old_value', v_old_value, 'new_value', p_new_data_contabil);
END;
$$;


ALTER FUNCTION "public"."update_data_contabil_manual"("p_table_name" "text", "p_record_id" "uuid", "p_new_data_contabil" "date", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_data_contabil_manual"("p_table_name" "text", "p_record_id" "uuid", "p_new_data_contabil" "date", "p_reason" "text") IS 'RPC específica para alterar data_contabil manualmente. Única forma segura de alterar data_contabil após a venda ser criada.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_backup_orders_data_pre_agt" (
    "id" "text",
    "customer_name" "text",
    "customer_phone" "text",
    "customer_nif" "text",
    "delivery_address" "text",
    "total_amount" numeric(10,2),
    "status" "text",
    "created_at" timestamp(6) with time zone,
    "updated_at" timestamp(6) with time zone,
    "cost_amount" numeric(15,2),
    "payment_method" "text",
    "invoice_number" "text",
    "table_id" integer,
    "customer_id" "uuid",
    "user_id" "uuid",
    "event_id" "uuid",
    "is_event_order" boolean,
    "event_order_type" "public"."eventordertype",
    "data_contabil" "date",
    "tax_amount" numeric,
    "net_amount" numeric,
    "tax_rate" numeric,
    "items" "jsonb"
);


ALTER TABLE "public"."_backup_orders_data_pre_agt" OWNER TO "postgres";


COMMENT ON TABLE "public"."_backup_orders_data_pre_agt" IS 'Backup completo dos dados da tabela orders antes da migration AGT';



CREATE TABLE IF NOT EXISTS "public"."_backup_orders_structure_pre_agt" (
    "column_name" character varying(128),
    "data_type" character varying(128),
    "character_maximum_length" integer,
    "numeric_precision" integer,
    "numeric_scale" integer,
    "column_default" "text",
    "is_nullable" character varying(3),
    "ordinal_position" integer
);


ALTER TABLE "public"."_backup_orders_structure_pre_agt" OWNER TO "postgres";


COMMENT ON TABLE "public"."_backup_orders_structure_pre_agt" IS 'Backup da estrutura da tabela orders antes da migration AGT';



CREATE TABLE IF NOT EXISTS "public"."_migration_log" (
    "id" integer NOT NULL,
    "migration_name" character varying(100),
    "action" character varying(50),
    "status" character varying(20),
    "executed_at" timestamp without time zone DEFAULT "now"(),
    "details" "text"
);


ALTER TABLE "public"."_migration_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."_migration_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."_migration_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."_migration_log_id_seq" OWNED BY "public"."_migration_log"."id";



CREATE TABLE IF NOT EXISTS "public"."active_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "local_id" "text" NOT NULL,
    "table_id" integer,
    "type" "text" DEFAULT 'LOCAL'::"text",
    "status" "text" DEFAULT 'ABERTO'::"text" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb",
    "total" numeric(10,2) DEFAULT 0,
    "tax_total" numeric(10,2) DEFAULT 0,
    "profit" numeric(10,2) DEFAULT 0,
    "sub_account_name" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "device_id" "text",
    "session_id" "text"
);


ALTER TABLE "public"."active_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."active_orders" IS 'Tabela para persistir contas abertas no Supabase. Resolve problema de perda de dados após falha de energia.';



CREATE TABLE IF NOT EXISTS "public"."agt_compliance_logs" (
    "id" integer NOT NULL,
    "log_type" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "request_data" "jsonb",
    "response_data" "jsonb",
    "error_message" "text",
    "timestamp" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."agt_compliance_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."agt_compliance_logs" IS 'Logs de comunicação com AGT para conformidade';



COMMENT ON COLUMN "public"."agt_compliance_logs"."log_type" IS 'Tipo de log: SERIES_REGISTRATION, INVOICE_VALIDATION, SAFT_UPLOAD';



CREATE SEQUENCE IF NOT EXISTS "public"."agt_compliance_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."agt_compliance_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."agt_compliance_logs_id_seq" OWNED BY "public"."agt_compliance_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."agt_series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "series_code" character varying(20) NOT NULL,
    "series_year" integer NOT NULL,
    "document_type" character varying(2) NOT NULL,
    "establishment_number" character varying(10) DEFAULT '001'::character varying NOT NULL,
    "authorized_quantity" integer NOT NULL,
    "first_document_no" character varying(50) NOT NULL,
    "last_document_no" character varying(50) NOT NULL,
    "current_sequence" integer DEFAULT 0,
    "status" character varying(1) DEFAULT 'A'::character varying NOT NULL,
    "agt_registration_code" character varying(50),
    "agt_registered_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "agt_series_authorized_quantity_check" CHECK (("authorized_quantity" > 0)),
    CONSTRAINT "agt_series_check" CHECK (("current_sequence" <= "authorized_quantity")),
    CONSTRAINT "agt_series_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['A'::character varying, 'U'::character varying, 'F'::character varying])::"text"[])))
);


ALTER TABLE "public"."agt_series" OWNER TO "postgres";


COMMENT ON TABLE "public"."agt_series" IS 'Séries de faturação autorizadas pela AGT para conformidade fiscal';



CREATE TABLE IF NOT EXISTS "public"."agt_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" character varying(50) NOT NULL,
    "submission_uuid" character varying(36) NOT NULL,
    "order_id" "text",
    "document_no" character varying(50) NOT NULL,
    "document_type" character varying(2) NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "result_code" integer,
    "action_result_code" character varying(10),
    "submitted_at" timestamp without time zone DEFAULT "now"(),
    "processed_at" timestamp without time zone,
    "response_data" "jsonb",
    "error_details" "jsonb",
    "retry_count" integer DEFAULT 0,
    "last_retry_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "agt_submissions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."agt_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."agt_submissions" IS 'Tracking de submissões de documentos à AGT';



CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_name" "text" DEFAULT 'Tasca do Vereda'::"text",
    "logo_url" "text",
    "currency" "text" DEFAULT 'Kz'::"text",
    "is_qr_enabled" boolean DEFAULT true,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."application_state" (
    "id" "text" DEFAULT 'current_state'::"text" NOT NULL,
    "state" "jsonb",
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."application_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" integer NOT NULL,
    "user_id" character varying(255),
    "user_name" character varying(255),
    "action" character varying(100) NOT NULL,
    "module" character varying(50) NOT NULL,
    "entity_type" character varying(50),
    "entity_id" character varying(255),
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" character varying(50),
    "user_agent" "text",
    "timestamp" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Registo de auditoria para conformidade fiscal';



COMMENT ON COLUMN "public"."audit_logs"."action" IS 'Ação executada: CREATE_INVOICE, UPDATE_INVOICE, DELETE_INVOICE, REGISTER_SERIES';



COMMENT ON COLUMN "public"."audit_logs"."module" IS 'Módulo onde a ação ocorreu: POS, INVOICE, STOCK, AGT, SYSTEM';



CREATE TABLE IF NOT EXISTS "public"."audit_logs_archive" (
    "id" integer NOT NULL,
    "user_id" character varying(255),
    "user_name" character varying(255),
    "action" character varying(100) NOT NULL,
    "module" character varying(50) NOT NULL,
    "entity_type" character varying(50),
    "entity_id" character varying(255),
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" character varying(50),
    "user_agent" "text",
    "timestamp" timestamp without time zone DEFAULT "now"(),
    "archived_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs_archive" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs_archive" IS 'Arquivo de logs de auditoria com mais de 90 dias. Dados preservados para conformidade fiscal.';



CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."business_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legacy_revenue_kz" numeric(15,2) DEFAULT 0 NOT NULL,
    "description" "text",
    "period_start" "date",
    "period_end" "date",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."business_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_flow" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "type" "text" DEFAULT 'entrada'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "data_contabil" "date" NOT NULL,
    "closed_by" "text",
    CONSTRAINT "check_fecho_caixa_has_data_contabil" CHECK ((NOT (("category" = 'FECHO_CAIXA'::"text") AND ("data_contabil" IS NULL))))
);


ALTER TABLE "public"."cash_flow" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cash_flow"."data_contabil" IS 'Dia Operacional (Business Day) - Pode ser alterado manualmente no Supabase Dashboard em caso de necessidade. Lógica de cálculo na app: 05:00 de um dia até 04:59 do dia seguinte = dia atual (timezone Africa/Luanda UTC+1).';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "icon" "text" DEFAULT 'Utensils'::"text",
    "is_visible_digital" boolean DEFAULT true
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."closed_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "closed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."closed_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_reports" (
    "id" integer NOT NULL,
    "report_type" character varying(50) NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "generated_at" timestamp without time zone DEFAULT "now"(),
    "file_path" character varying(500),
    "file_size" integer,
    "status" character varying(20) DEFAULT 'GENERATED'::character varying,
    "uploaded_at" timestamp without time zone,
    "upload_id" character varying(255),
    "notes" "text"
);


ALTER TABLE "public"."compliance_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_reports" IS 'Relatórios de conformidade gerados para AGT';



COMMENT ON COLUMN "public"."compliance_reports"."report_type" IS 'Tipo de relatório: SAFT, INVOICE_SUMMARY, STOCK_SUMMARY';



CREATE SEQUENCE IF NOT EXISTS "public"."compliance_reports_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."compliance_reports_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."compliance_reports_id_seq" OWNED BY "public"."compliance_reports"."id";



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "address" "text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "balance" numeric(10,2) DEFAULT 0,
    "points" integer DEFAULT 0,
    "visits" integer DEFAULT 0,
    "last_visit" timestamp(6) with time zone
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_metrics_view" AS
 SELECT "public"."get_dashboard_metrics"('HOJE'::"text") AS "hoje",
    "public"."get_dashboard_metrics"('SEMANA'::"text") AS "semana",
    "public"."get_dashboard_metrics"('MÊS'::"text") AS "mes",
    "public"."get_dashboard_metrics"('ANO'::"text") AS "ano";


ALTER VIEW "public"."dashboard_metrics_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "text" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_name" "text",
    "customer_phone" "text",
    "customer_nif" "text",
    "delivery_address" "text",
    "total_amount" numeric(10,2),
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cost_amount" numeric(15,2) DEFAULT 0,
    "payment_method" "text" DEFAULT 'NUMERARIO'::"text",
    "invoice_number" "text",
    "table_id" integer,
    "customer_id" "uuid",
    "user_id" "uuid",
    "event_id" "uuid",
    "is_event_order" boolean DEFAULT false,
    "event_order_type" "public"."eventordertype",
    "data_contabil" "date" DEFAULT CURRENT_DATE,
    "tax_amount" numeric,
    "net_amount" numeric,
    "tax_rate" numeric,
    "items" "jsonb",
    "document_type" character varying(2) DEFAULT 'FT'::character varying,
    "document_status" character varying(1) DEFAULT 'N'::character varying,
    "eac_code" character varying(10),
    "customer_tax_id" character varying(20),
    "customer_country" character varying(2) DEFAULT 'AO'::character varying,
    "agt_submission_uuid" character varying(36),
    "agt_request_id" character varying(50),
    "agt_status" character varying(20),
    "agt_submitted_at" timestamp without time zone,
    "agt_validated_at" timestamp without time zone,
    "jws_document_signature" "text",
    "deductible_vat_percentage" numeric(5,2),
    "non_deductible_amount" numeric(15,2)
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."data_contabil" IS 'Dia Operacional (Business Day) - Pode ser alterado manualmente no Supabase Dashboard em caso de necessidade. Lógica de cálculo na app: 05:00 de um dia até 04:59 do dia seguinte = dia atual (timezone Africa/Luanda UTC+1).';



COMMENT ON COLUMN "public"."orders"."document_type" IS 'Tipo de documento fiscal AGT: FT, FR, ND, NC, TV, VD';



COMMENT ON COLUMN "public"."orders"."document_status" IS 'Status do documento AGT: N, S, A, R, C';



COMMENT ON COLUMN "public"."orders"."eac_code" IS 'Código EAC para operações especiais conforme tabela AGT';



COMMENT ON COLUMN "public"."orders"."customer_tax_id" IS 'NIF do cliente adquirente';



COMMENT ON COLUMN "public"."orders"."customer_country" IS 'Código ISO do país do cliente (AO para Angola)';



COMMENT ON COLUMN "public"."orders"."agt_submission_uuid" IS 'UUID da submissão na AGT';



COMMENT ON COLUMN "public"."orders"."agt_request_id" IS 'ID do request AGT para tracking de status';



COMMENT ON COLUMN "public"."orders"."agt_status" IS 'Status na AGT: pending, processing, accepted, rejected, cancelled';



COMMENT ON COLUMN "public"."orders"."agt_submitted_at" IS 'Data/hora de submissão à AGT';



COMMENT ON COLUMN "public"."orders"."agt_validated_at" IS 'Data/hora de validação final pela AGT';



COMMENT ON COLUMN "public"."orders"."jws_document_signature" IS 'Assinatura digital JWS RS256 do documento fiscal';



COMMENT ON COLUMN "public"."orders"."deductible_vat_percentage" IS 'Percentagem de IVA dedutível para validação pelo cliente (4.7)';



COMMENT ON COLUMN "public"."orders"."non_deductible_amount" IS 'Valor não dedutível para validação pelo cliente (4.7)';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "category_id" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cost_price" numeric DEFAULT 0,
    "description" "text",
    "stock_quantity" integer DEFAULT 0,
    "unit" "text" DEFAULT 'un'::"text",
    "sku" "text",
    "min_stock" integer DEFAULT 10,
    "tax_rate" numeric(5,2) DEFAULT 14.00 NOT NULL,
    "tax_code" "text" DEFAULT 'NOR'::"text" NOT NULL,
    "product_code" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."tax_rate" IS 'Taxa de IVA aplicável (ex: 14.00 para 14%)';



COMMENT ON COLUMN "public"."products"."tax_code" IS 'Código da taxa (NOR = Normal, RED = Reduzida, ISE = Isento)';



COMMENT ON COLUMN "public"."products"."product_code" IS 'Código do produto para SAFT';



CREATE OR REPLACE VIEW "public"."dashboard_stats_v2" AS
 SELECT "id" AS "order_id",
    "total_amount",
    "payment_method",
    "created_at",
    ( SELECT "sum"((("oi"."quantity")::numeric * "p"."cost_price")) AS "sum"
           FROM ("public"."order_items" "oi"
             JOIN "public"."products" "p" ON (("oi"."product_id" = "p"."id")))
          WHERE ("oi"."order_id" = "o"."id")) AS "total_cost"
   FROM "public"."orders" "o"
  WHERE ("status" = 'closed'::"text");


ALTER VIEW "public"."dashboard_stats_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_contabil_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "old_value" "date",
    "new_value" "date",
    "changed_by" "text" DEFAULT CURRENT_USER,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "change_reason" "text",
    "is_manual" boolean DEFAULT false
);


ALTER TABLE "public"."data_contabil_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_contabil_audit_log" IS 'Tabela de auditoria para rastrear todas as mudanças em data_contabil. Útil para investigar alterações inesperadas.';



CREATE OR REPLACE VIEW "public"."data_contabil_audit_view" AS
 SELECT "id",
    "table_name",
    "record_id",
    "old_value",
    "new_value",
    "changed_by",
    "changed_at",
    "change_reason",
    "is_manual"
   FROM "public"."data_contabil_audit_log"
  ORDER BY "changed_at" DESC;


ALTER VIEW "public"."data_contabil_audit_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."data_contabil_audit_view" IS 'View para ver histórico de auditoria de mudanças em data_contabil. Ordenado por data mais recente.';



CREATE OR REPLACE VIEW "public"."dishes" AS
 SELECT "id",
    "name",
    COALESCE("price", (0)::numeric) AS "price",
    COALESCE("cost_price", (0)::numeric) AS "cost_price",
    "category_id",
    COALESCE("description", ''::"text") AS "description",
    "image_url" AS "image",
    COALESCE("is_active", true) AS "is_visible_digital",
    false AS "is_featured"
   FROM "public"."products";


ALTER VIEW "public"."dishes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_type" "public"."eventordertype" DEFAULT 'INCLUIDO'::"public"."eventordertype",
    "table_number" integer,
    "is_unlimited" boolean DEFAULT false,
    "unlimited_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "event_type" "public"."eventtype",
    "min_guests" integer DEFAULT 1,
    "max_guests" integer DEFAULT 10,
    "included_items" "jsonb" DEFAULT '[]'::"jsonb",
    "base_price" numeric(12,2) DEFAULT 0,
    "price_per_person" numeric(12,2) DEFAULT 0,
    "allowed_areas" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "duration_hours" integer DEFAULT 4,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."eventtype" NOT NULL,
    "status" "public"."eventstatus" DEFAULT 'PLANEADO'::"public"."eventstatus",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "customer_email" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "start_time" "text",
    "end_time" "text",
    "area" "public"."eventarea",
    "tables_reserved" integer[] DEFAULT '{}'::integer[],
    "guests_count" integer DEFAULT 0,
    "guests_confirmed" integer DEFAULT 0,
    "package_id" "uuid",
    "included_items" "jsonb" DEFAULT '[]'::"jsonb",
    "consumption_mode" "public"."consumptiontype" DEFAULT 'PACOTE_FECHADO'::"public"."consumptiontype",
    "base_amount" numeric(12,2) DEFAULT 0,
    "extras_amount" numeric(12,2) DEFAULT 0,
    "deposit_amount" numeric(12,2) DEFAULT 0,
    "final_amount" numeric(12,2) DEFAULT 0,
    "notes" "text",
    "special_requests" "text",
    "assigned_staff" "uuid"[] DEFAULT '{}'::"uuid"[],
    "external_suppliers" "jsonb" DEFAULT '[]'::"jsonb",
    "schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "artist_name" "text",
    "artist_fee" numeric DEFAULT 0,
    "ticket_price" numeric DEFAULT 0,
    "tickets_sold" integer DEFAULT 0,
    "includes_standard_meal" boolean DEFAULT false,
    "standard_meal_cost_per_person" numeric DEFAULT 0,
    "show_setup_time" "text",
    "show_soundcheck_time" "text",
    "show_start_time" "text",
    "show_end_time" "text",
    "estimated_profit" numeric DEFAULT 0,
    "break_even_point" numeric DEFAULT 0
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text" NOT NULL,
    "amount_kz" numeric(15,2) NOT NULL,
    "category" "text" NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "period_start" "date",
    "period_end" "date",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'pago'::"text",
    "category_name" "text"
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_name" "text" NOT NULL,
    "total_revenue" numeric DEFAULT 0 NOT NULL,
    "gross_profit" numeric DEFAULT 0 NOT NULL,
    "period" "text" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."external_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "description" "text",
    "transaction_date" timestamp with time zone NOT NULL,
    "transaction_type" character varying(50) NOT NULL,
    "category" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_sequences" (
    "id" integer NOT NULL,
    "series_id" integer,
    "year" integer NOT NULL,
    "sequence_number" integer NOT NULL,
    "last_used" timestamp without time zone
);


ALTER TABLE "public"."invoice_sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_sequences" IS 'Controle de sequencialidade única de faturas por série e ano';



COMMENT ON COLUMN "public"."invoice_sequences"."sequence_number" IS 'Último número de sequência usado';



CREATE SEQUENCE IF NOT EXISTS "public"."invoice_sequences_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_sequences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoice_sequences_id_seq" OWNED BY "public"."invoice_sequences"."id";



CREATE TABLE IF NOT EXISTS "public"."invoice_series" (
    "id" integer NOT NULL,
    "series_code" character varying(10) NOT NULL,
    "description" "text",
    "invoice_type" character varying(20) NOT NULL,
    "is_active" boolean DEFAULT true,
    "agt_registered" boolean DEFAULT false,
    "agt_registration_date" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_series" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_series" IS 'Séries de faturas registadas na AGT para conformidade fiscal';



COMMENT ON COLUMN "public"."invoice_series"."agt_registered" IS 'Indica se a série foi registada na AGT';



CREATE SEQUENCE IF NOT EXISTS "public"."invoice_series_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_series_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoice_series_id_seq" OWNED BY "public"."invoice_series"."id";



CREATE TABLE IF NOT EXISTS "public"."irt_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bracket" integer NOT NULL,
    "min_amount" numeric(12,2) NOT NULL,
    "max_amount" numeric(12,2) NOT NULL,
    "tax_rate" numeric(6,4) NOT NULL,
    "year" integer DEFAULT 2024 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."irt_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "text" NOT NULL,
    "salary_payment_id" "uuid",
    "month_year" character varying(7) NOT NULL,
    "receipt_number" character varying(50) NOT NULL,
    "gross_salary" numeric(12,2) NOT NULL,
    "total_subsidies" numeric(12,2) DEFAULT 0,
    "inss_worker" numeric(12,2) DEFAULT 0,
    "inss_employer" numeric(12,2) DEFAULT 0,
    "irt_amount" numeric(12,2) DEFAULT 0,
    "irt_bracket" integer DEFAULT 0,
    "net_salary" numeric(12,2) NOT NULL,
    "receipt_hash" character varying(64),
    "generated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "printed_at" timestamp with time zone,
    "pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."payroll_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_active_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "text" NOT NULL,
    "active_orders" "jsonb" NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "sync_status" "text" DEFAULT 'synced'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pos_active_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_tables" (
    "id" integer NOT NULL,
    "name" "text" DEFAULT 'Mesa'::"text" NOT NULL,
    "seats" integer DEFAULT 4,
    "status" "text" DEFAULT 'LIVRE'::"text",
    "x" integer DEFAULT 0,
    "y" integer DEFAULT 0,
    "zone" "text" DEFAULT 'INTERIOR'::"text",
    "shape" "text" DEFAULT 'SQUARE'::"text",
    "rotation" integer DEFAULT 0,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "event_id" "uuid",
    "event_reserved" boolean DEFAULT false
);


ALTER TABLE "public"."pos_tables" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pos_tables_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pos_tables_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pos_tables_id_seq" OWNED BY "public"."pos_tables"."id";



CREATE TABLE IF NOT EXISTS "public"."purchase_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "description" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "provider" "text" NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "proforma_url" "text",
    "receipt_url" "text",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp(6) with time zone,
    "notes" "text",
    "approval_token" "text"
);


ALTER TABLE "public"."purchase_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salary_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "text" NOT NULL,
    "month_year" "text" NOT NULL,
    "base_salary" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_subsidies" numeric(12,2) DEFAULT 0 NOT NULL,
    "overtime_bonus" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_discounts" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_salary" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "processed_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "gross_salary" numeric(12,2) DEFAULT 0,
    "inss_worker" numeric(12,2) DEFAULT 0,
    "inss_employer" numeric(12,2) DEFAULT 0,
    "irt_amount" numeric(12,2) DEFAULT 0,
    "taxable_income" numeric(12,2) DEFAULT 0,
    "irt_bracket" integer DEFAULT 0,
    "irt_rate" numeric(5,2) DEFAULT 0,
    "receipt_number" character varying(50),
    "receipt_hash" character varying(64),
    "payment_date" "date",
    "payment_method" character varying(50) DEFAULT 'TRANSFERENCIA'::character varying
);


ALTER TABLE "public"."salary_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."show_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "expense_type" "text" NOT NULL,
    "description" "text",
    "amount" numeric NOT NULL,
    "paid" boolean DEFAULT false,
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "show_expenses_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "show_expenses_expense_type_check" CHECK (("expense_type" = ANY (ARRAY['ARTIST_FEE'::"text", 'TRANSPORT'::"text", 'EQUIPMENT'::"text", 'STAFF'::"text", 'MARKETING'::"text", 'OTHER'::"text"])))
);


ALTER TABLE "public"."show_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."show_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "revenue_type" "text" NOT NULL,
    "description" "text",
    "amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "show_revenue_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "show_revenue_revenue_type_check" CHECK (("revenue_type" = ANY (ARRAY['TICKETS'::"text", 'SPONSORSHIP'::"text", 'MERCHANDISE'::"text", 'POS_SALES'::"text"])))
);


ALTER TABLE "public"."show_revenue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text",
    "base_salary_kz" numeric(12,2) DEFAULT 0,
    "phone" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "subsidios" numeric DEFAULT 0,
    "bonus" numeric DEFAULT 0,
    "horas_extras" numeric DEFAULT 0,
    "descontos" numeric DEFAULT 0,
    "salario_base" numeric DEFAULT 0,
    "nif" character varying(20),
    "admission_date" "date",
    "contract_type" character varying(50) DEFAULT 'INDEFINIDO'::character varying,
    "irt_exempt" boolean DEFAULT false,
    "auto_calculate_tax" boolean DEFAULT true,
    "food_allowance" numeric(12,2) DEFAULT 0,
    "transport_allowance" numeric(12,2) DEFAULT 0,
    "overtime_hourly_rate" numeric(12,2) DEFAULT 0,
    "daily_work_hours" integer DEFAULT 8,
    "work_days_per_month" integer DEFAULT 22,
    "color" character varying(7) DEFAULT '#06b6d4'::character varying,
    "external_bio_id" character varying(50),
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "text",
    "shift_start" time(6) without time zone,
    "shift_end" time(6) without time zone,
    "work_days" "text"[],
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."staff_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" integer NOT NULL,
    "product_id" character varying(255) NOT NULL,
    "movement_type" character varying(20) NOT NULL,
    "quantity" integer NOT NULL,
    "reference_type" character varying(20),
    "reference_id" character varying(255),
    "previous_quantity" integer NOT NULL,
    "new_quantity" integer NOT NULL,
    "user_id" character varying(255),
    "notes" "text",
    "timestamp" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_movements" IS 'Movimentos de stock obrigatórios para conformidade AGT';



COMMENT ON COLUMN "public"."stock_movements"."movement_type" IS 'Tipo de movimento: ENTRADA, SAIDA, AJUSTE, VENDA, DEVOLUCAO';



COMMENT ON COLUMN "public"."stock_movements"."reference_type" IS 'Tipo de documento de referência: INVOICE, PURCHASE, ADJUSTMENT, INVENTORY';



CREATE SEQUENCE IF NOT EXISTS "public"."stock_movements_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stock_movements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stock_movements_id_seq" OWNED BY "public"."stock_movements"."id";



CREATE TABLE IF NOT EXISTS "public"."tax_rates" (
    "id" integer NOT NULL,
    "code" character varying(10) NOT NULL,
    "description" "text" NOT NULL,
    "rate" numeric(5,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."tax_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."tax_rates" IS 'Taxas de imposto IVA angolanas (NOR, RED, ISE)';



COMMENT ON COLUMN "public"."tax_rates"."code" IS 'Código do imposto conforme AGT (NOR, RED, ISE)';



CREATE SEQUENCE IF NOT EXISTS "public"."tax_rates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tax_rates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tax_rates_id_seq" OWNED BY "public"."tax_rates"."id";



ALTER TABLE ONLY "public"."_migration_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."_migration_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agt_compliance_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agt_compliance_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."compliance_reports" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."compliance_reports_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoice_sequences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoice_sequences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoice_series" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoice_series_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pos_tables" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pos_tables_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stock_movements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_movements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tax_rates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tax_rates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_migration_log"
    ADD CONSTRAINT "_migration_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."active_orders"
    ADD CONSTRAINT "active_orders_local_id_key" UNIQUE ("local_id");



ALTER TABLE ONLY "public"."active_orders"
    ADD CONSTRAINT "active_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agt_compliance_logs"
    ADD CONSTRAINT "agt_compliance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agt_series"
    ADD CONSTRAINT "agt_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agt_series"
    ADD CONSTRAINT "agt_series_series_code_series_year_document_type_key" UNIQUE ("series_code", "series_year", "document_type");



ALTER TABLE ONLY "public"."agt_submissions"
    ADD CONSTRAINT "agt_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agt_submissions"
    ADD CONSTRAINT "agt_submissions_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application_state"
    ADD CONSTRAINT "application_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_stats"
    ADD CONSTRAINT "business_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_flow"
    ADD CONSTRAINT "cash_flow_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."closed_days"
    ADD CONSTRAINT "closed_days_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."closed_days"
    ADD CONSTRAINT "closed_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_reports"
    ADD CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_contabil_audit_log"
    ADD CONSTRAINT "data_contabil_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_orders"
    ADD CONSTRAINT "event_orders_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."event_orders"
    ADD CONSTRAINT "event_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_packages"
    ADD CONSTRAINT "event_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_history"
    ADD CONSTRAINT "external_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_history"
    ADD CONSTRAINT "financial_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_series_id_year_key" UNIQUE ("series_id", "year");



ALTER TABLE ONLY "public"."invoice_series"
    ADD CONSTRAINT "invoice_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_series"
    ADD CONSTRAINT "invoice_series_series_code_key" UNIQUE ("series_code");



ALTER TABLE ONLY "public"."irt_config"
    ADD CONSTRAINT "irt_config_bracket_year_unique" UNIQUE ("bracket", "year");



ALTER TABLE ONLY "public"."irt_config"
    ADD CONSTRAINT "irt_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_invoice_number_unique" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_receipts"
    ADD CONSTRAINT "payroll_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_active_sessions"
    ADD CONSTRAINT "pos_active_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_tables"
    ADD CONSTRAINT "pos_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salary_payments"
    ADD CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."show_expenses"
    ADD CONSTRAINT "show_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."show_revenue"
    ADD CONSTRAINT "show_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_schedules"
    ADD CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_flow"
    ADD CONSTRAINT "unique_cash_flow_category_date" UNIQUE ("category", "data_contabil");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "unique_expenses_description_amount_category" UNIQUE ("description", "amount_kz", "category");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "unique_orders_invoice_number" UNIQUE ("invoice_number");



CREATE UNIQUE INDEX "application_state_id_key" ON "public"."application_state" USING "btree" ("id");



CREATE INDEX "idx_active_orders_device" ON "public"."active_orders" USING "btree" ("device_id");



CREATE INDEX "idx_active_orders_local_id" ON "public"."active_orders" USING "btree" ("local_id");



CREATE INDEX "idx_active_orders_status" ON "public"."active_orders" USING "btree" ("status");



CREATE INDEX "idx_active_orders_table_id" ON "public"."active_orders" USING "btree" ("table_id");



CREATE INDEX "idx_active_orders_timestamp" ON "public"."active_orders" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_agt_compliance_logs_status" ON "public"."agt_compliance_logs" USING "btree" ("status");



CREATE INDEX "idx_agt_compliance_logs_type" ON "public"."agt_compliance_logs" USING "btree" ("log_type");



CREATE INDEX "idx_agt_series_code_year" ON "public"."agt_series" USING "btree" ("series_code", "series_year");



CREATE INDEX "idx_agt_series_document_type" ON "public"."agt_series" USING "btree" ("document_type");



CREATE INDEX "idx_agt_series_status" ON "public"."agt_series" USING "btree" ("status") WHERE (("status")::"text" = 'U'::"text");



CREATE INDEX "idx_agt_submissions_document" ON "public"."agt_submissions" USING "btree" ("document_no");



CREATE INDEX "idx_agt_submissions_order" ON "public"."agt_submissions" USING "btree" ("order_id");



CREATE INDEX "idx_agt_submissions_pending" ON "public"."agt_submissions" USING "btree" ("status") WHERE (("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying])::"text"[]));



CREATE INDEX "idx_agt_submissions_request" ON "public"."agt_submissions" USING "btree" ("request_id");



CREATE INDEX "idx_agt_submissions_status" ON "public"."agt_submissions" USING "btree" ("status");



CREATE INDEX "idx_audit_log_date" ON "public"."data_contabil_audit_log" USING "btree" ("changed_at");



CREATE INDEX "idx_audit_log_table_record" ON "public"."data_contabil_audit_log" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_logs_archive_module" ON "public"."audit_logs_archive" USING "btree" ("module");



CREATE INDEX "idx_audit_logs_archive_timestamp" ON "public"."audit_logs_archive" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_module" ON "public"."audit_logs" USING "btree" ("module");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_business_stats_created_at" ON "public"."business_stats" USING "btree" ("created_at");



CREATE INDEX "idx_business_stats_period" ON "public"."business_stats" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_cash_flow_category" ON "public"."cash_flow" USING "btree" ("category");



CREATE INDEX "idx_cash_flow_created_at" ON "public"."cash_flow" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_cash_flow_data_contabil" ON "public"."cash_flow" USING "btree" ("data_contabil");



CREATE INDEX "idx_cash_flow_type" ON "public"."cash_flow" USING "btree" ("type");



CREATE INDEX "idx_categories_name" ON "public"."categories" USING "btree" ("name");



CREATE INDEX "idx_closed_days_date" ON "public"."closed_days" USING "btree" ("date");



CREATE INDEX "idx_compliance_reports_period" ON "public"."compliance_reports" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_compliance_reports_type" ON "public"."compliance_reports" USING "btree" ("report_type");



CREATE INDEX "idx_event_orders_event" ON "public"."event_orders" USING "btree" ("event_id");



CREATE INDEX "idx_event_orders_type" ON "public"."event_orders" USING "btree" ("order_type");



CREATE INDEX "idx_event_packages_active" ON "public"."event_packages" USING "btree" ("is_active");



CREATE INDEX "idx_event_packages_type" ON "public"."event_packages" USING "btree" ("event_type");



CREATE INDEX "idx_events_date" ON "public"."events" USING "btree" ("start_date");



CREATE INDEX "idx_events_package" ON "public"."events" USING "btree" ("package_id");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_events_type" ON "public"."events" USING "btree" ("type");



CREATE INDEX "idx_expenses_category" ON "public"."expenses" USING "btree" ("category");



CREATE INDEX "idx_expenses_created_at" ON "public"."expenses" USING "btree" ("created_at");



CREATE INDEX "idx_external_history_period" ON "public"."external_history" USING "btree" ("period");



CREATE INDEX "idx_external_history_source" ON "public"."external_history" USING "btree" ("source_name");



CREATE INDEX "idx_financial_history_transaction_date" ON "public"."financial_history" USING "btree" ("transaction_date");



CREATE INDEX "idx_financial_history_transaction_type" ON "public"."financial_history" USING "btree" ("transaction_type");



CREATE INDEX "idx_invoice_sequences_series_year" ON "public"."invoice_sequences" USING "btree" ("series_id", "year");



CREATE INDEX "idx_invoice_series_active" ON "public"."invoice_series" USING "btree" ("is_active");



CREATE INDEX "idx_order_items_created_at" ON "public"."order_items" USING "btree" ("created_at");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_agt_request_id" ON "public"."orders" USING "btree" ("agt_request_id") WHERE ("agt_request_id" IS NOT NULL);



CREATE INDEX "idx_orders_agt_status" ON "public"."orders" USING "btree" ("agt_status") WHERE ("agt_status" IS NOT NULL);



CREATE INDEX "idx_orders_agt_submitted_at" ON "public"."orders" USING "btree" ("agt_submitted_at") WHERE ("agt_submitted_at" IS NOT NULL);



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_customer_tax_id" ON "public"."orders" USING "btree" ("customer_tax_id") WHERE ("customer_tax_id" IS NOT NULL);



CREATE INDEX "idx_orders_data_contabil" ON "public"."orders" USING "btree" ("data_contabil");



CREATE INDEX "idx_orders_document_type" ON "public"."orders" USING "btree" ("document_type");



CREATE INDEX "idx_orders_event" ON "public"."orders" USING "btree" ("event_id");



CREATE INDEX "idx_orders_payment_method" ON "public"."orders" USING "btree" ("payment_method");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_payroll_receipts_month" ON "public"."payroll_receipts" USING "btree" ("month_year");



CREATE INDEX "idx_payroll_receipts_staff" ON "public"."payroll_receipts" USING "btree" ("staff_id");



CREATE INDEX "idx_pos_sessions_establishment" ON "public"."pos_active_sessions" USING "btree" ("establishment_id");



CREATE INDEX "idx_pos_sessions_updated" ON "public"."pos_active_sessions" USING "btree" ("last_updated");



CREATE INDEX "idx_pos_tables_event" ON "public"."pos_tables" USING "btree" ("event_id");



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_name" ON "public"."products" USING "btree" ("name");



CREATE INDEX "idx_products_price" ON "public"."products" USING "btree" ("price");



CREATE INDEX "idx_products_product_code" ON "public"."products" USING "btree" ("product_code");



CREATE INDEX "idx_products_stock" ON "public"."products" USING "btree" ("stock_quantity");



CREATE INDEX "idx_products_tax_code" ON "public"."products" USING "btree" ("tax_code");



CREATE INDEX "idx_products_tax_rate" ON "public"."products" USING "btree" ("tax_rate");



CREATE INDEX "idx_purchase_requests_approval_token" ON "public"."purchase_requests" USING "btree" ("approval_token");



CREATE INDEX "idx_purchase_requests_created_at" ON "public"."purchase_requests" USING "btree" ("created_at");



CREATE INDEX "idx_purchase_requests_status" ON "public"."purchase_requests" USING "btree" ("status");



CREATE INDEX "idx_salary_payments_month_year" ON "public"."salary_payments" USING "btree" ("month_year");



CREATE INDEX "idx_salary_payments_staff_id" ON "public"."salary_payments" USING "btree" ("staff_id");



CREATE INDEX "idx_salary_payments_status" ON "public"."salary_payments" USING "btree" ("status");



CREATE INDEX "idx_show_expenses_event_id" ON "public"."show_expenses" USING "btree" ("event_id");



CREATE INDEX "idx_show_expenses_type" ON "public"."show_expenses" USING "btree" ("expense_type");



CREATE INDEX "idx_show_revenue_event_id" ON "public"."show_revenue" USING "btree" ("event_id");



CREATE INDEX "idx_show_revenue_type" ON "public"."show_revenue" USING "btree" ("revenue_type");



CREATE INDEX "idx_staff_schedules_staff_id" ON "public"."staff_schedules" USING "btree" ("staff_id");



CREATE INDEX "idx_staff_status" ON "public"."staff" USING "btree" ("status");



CREATE INDEX "idx_stock_movements_product" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_movements_timestamp" ON "public"."stock_movements" USING "btree" ("timestamp");



CREATE INDEX "idx_stock_movements_type" ON "public"."stock_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_tax_rates_active" ON "public"."tax_rates" USING "btree" ("is_active");



CREATE UNIQUE INDEX "unique_approval_token" ON "public"."purchase_requests" USING "btree" ("approval_token");



CREATE UNIQUE INDEX "unique_staff_month_year" ON "public"."salary_payments" USING "btree" ("staff_id", "month_year");



CREATE OR REPLACE TRIGGER "log_data_contabil_change" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_data_contabil_change"();



CREATE OR REPLACE TRIGGER "set_purchase_approval_token" BEFORE INSERT ON "public"."purchase_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_approval_token"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."salary_payments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_audit_log_invoice" AFTER INSERT OR DELETE OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_invoice_changes"();



CREATE OR REPLACE TRIGGER "trigger_stock_movement_on_sale" AFTER UPDATE ON "public"."orders" FOR EACH ROW WHEN ((("old"."status" <> 'FECHADO'::"text") AND ("new"."status" = 'FECHADO'::"text"))) EXECUTE FUNCTION "public"."register_stock_movement_on_sale"();



CREATE OR REPLACE TRIGGER "update_active_orders_updated_at_trigger" BEFORE UPDATE ON "public"."active_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_active_orders_updated_at"();



CREATE OR REPLACE TRIGGER "update_business_stats_updated_at" BEFORE UPDATE ON "public"."business_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_order_items_updated_at" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agt_submissions"
    ADD CONSTRAINT "agt_submissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_orders"
    ADD CONSTRAINT "event_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."event_packages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_sequences"
    ADD CONSTRAINT "invoice_sequences_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."invoice_series"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."payroll_receipts"
    ADD CONSTRAINT "payroll_receipts_salary_payment_id_fkey" FOREIGN KEY ("salary_payment_id") REFERENCES "public"."salary_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_receipts"
    ADD CONSTRAINT "payroll_receipts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos_tables"
    ADD CONSTRAINT "pos_tables_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."salary_payments"
    ADD CONSTRAINT "salary_payments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."show_expenses"
    ADD CONSTRAINT "show_expenses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."show_revenue"
    ADD CONSTRAINT "show_revenue_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_schedules"
    ADD CONSTRAINT "staff_schedules_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all irt_config" ON "public"."irt_config" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on pos_active_sessions" ON "public"."pos_active_sessions" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can delete order items" ON "public"."order_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert order items" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can select order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update order items" ON "public"."order_items" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Users can delete financial history" ON "public"."financial_history" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert financial history" ON "public"."financial_history" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can update financial history" ON "public"."financial_history" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view financial history" ON "public"."financial_history" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."active_orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."agt_series";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cash_flow";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."categories";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."closed_days";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."customers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_packages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expenses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."external_history";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pos_active_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pos_tables";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."purchase_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."salary_payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."show_expenses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."show_revenue";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."staff";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."staff_schedules";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_movements";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tax_rates";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_active_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_active_orders"() TO "anon";



GRANT ALL ON FUNCTION "public"."delete_active_order"("p_local_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_active_order"("p_local_id" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."get_active_orders"("p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_orders"("p_device_id" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."get_closed_days_safe"() TO "anon";



GRANT ALL ON FUNCTION "public"."mark_day_closed_safe"("p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."remove_day_closed_safe"("p_date" "date") TO "anon";



GRANT ALL ON FUNCTION "public"."save_active_order"("p_local_id" "text", "p_table_id" integer, "p_type" "text", "p_status" "text", "p_items" "jsonb", "p_total" numeric, "p_tax_total" numeric, "p_profit" numeric, "p_sub_account_name" "text", "p_device_id" "text", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_active_order"("p_local_id" "text", "p_table_id" integer, "p_type" "text", "p_status" "text", "p_items" "jsonb", "p_total" numeric, "p_tax_total" numeric, "p_profit" numeric, "p_sub_account_name" "text", "p_device_id" "text", "p_session_id" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."update_data_contabil_manual"("p_table_name" "text", "p_record_id" "uuid", "p_new_data_contabil" "date", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_data_contabil_manual"("p_table_name" "text", "p_record_id" "uuid", "p_new_data_contabil" "date", "p_reason" "text") TO "anon";


















GRANT ALL ON TABLE "public"."_backup_orders_data_pre_agt" TO "anon";
GRANT ALL ON TABLE "public"."_backup_orders_data_pre_agt" TO "authenticated";



GRANT ALL ON TABLE "public"."_backup_orders_structure_pre_agt" TO "anon";
GRANT ALL ON TABLE "public"."_backup_orders_structure_pre_agt" TO "authenticated";



GRANT ALL ON TABLE "public"."_migration_log" TO "anon";
GRANT ALL ON TABLE "public"."_migration_log" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."_migration_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."_migration_log_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."active_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."active_orders" TO "anon";



GRANT ALL ON TABLE "public"."agt_compliance_logs" TO "anon";
GRANT ALL ON TABLE "public"."agt_compliance_logs" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."agt_compliance_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agt_compliance_logs_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."agt_series" TO "anon";
GRANT ALL ON TABLE "public"."agt_series" TO "authenticated";



GRANT ALL ON TABLE "public"."agt_submissions" TO "anon";
GRANT ALL ON TABLE "public"."agt_submissions" TO "authenticated";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."application_state" TO "anon";
GRANT ALL ON TABLE "public"."application_state" TO "authenticated";
GRANT ALL ON TABLE "public"."application_state" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs_archive" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs_archive" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."business_stats" TO "anon";
GRANT ALL ON TABLE "public"."business_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."business_stats" TO "service_role";



GRANT ALL ON TABLE "public"."cash_flow" TO "anon";
GRANT ALL ON TABLE "public"."cash_flow" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_flow" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."closed_days" TO "anon";
GRANT ALL ON TABLE "public"."closed_days" TO "authenticated";



GRANT ALL ON TABLE "public"."compliance_reports" TO "anon";
GRANT ALL ON TABLE "public"."compliance_reports" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."compliance_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."compliance_reports_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."data_contabil_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."data_contabil_audit_log" TO "authenticated";



GRANT SELECT ON TABLE "public"."data_contabil_audit_view" TO "authenticated";
GRANT SELECT ON TABLE "public"."data_contabil_audit_view" TO "anon";



GRANT ALL ON TABLE "public"."event_orders" TO "anon";
GRANT ALL ON TABLE "public"."event_orders" TO "authenticated";



GRANT ALL ON TABLE "public"."event_packages" TO "anon";
GRANT ALL ON TABLE "public"."event_packages" TO "authenticated";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."external_history" TO "anon";
GRANT ALL ON TABLE "public"."external_history" TO "authenticated";
GRANT ALL ON TABLE "public"."external_history" TO "service_role";



GRANT ALL ON TABLE "public"."financial_history" TO "anon";
GRANT ALL ON TABLE "public"."financial_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."financial_history" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_sequences" TO "anon";
GRANT ALL ON TABLE "public"."invoice_sequences" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."invoice_sequences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_sequences_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."invoice_series" TO "anon";
GRANT ALL ON TABLE "public"."invoice_series" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."invoice_series_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_series_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."irt_config" TO "anon";
GRANT ALL ON TABLE "public"."irt_config" TO "authenticated";



GRANT ALL ON TABLE "public"."payroll_receipts" TO "anon";
GRANT ALL ON TABLE "public"."payroll_receipts" TO "authenticated";



GRANT ALL ON TABLE "public"."pos_active_sessions" TO "anon";
GRANT ALL ON TABLE "public"."pos_active_sessions" TO "authenticated";



GRANT ALL ON TABLE "public"."pos_tables" TO "anon";
GRANT ALL ON TABLE "public"."pos_tables" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_tables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pos_tables_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pos_tables_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pos_tables_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_requests" TO "anon";
GRANT ALL ON TABLE "public"."purchase_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_requests" TO "service_role";



GRANT ALL ON TABLE "public"."salary_payments" TO "anon";
GRANT ALL ON TABLE "public"."salary_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."salary_payments" TO "service_role";



GRANT ALL ON TABLE "public"."show_expenses" TO "anon";
GRANT ALL ON TABLE "public"."show_expenses" TO "authenticated";



GRANT ALL ON TABLE "public"."show_revenue" TO "anon";
GRANT ALL ON TABLE "public"."show_revenue" TO "authenticated";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_schedules" TO "anon";
GRANT ALL ON TABLE "public"."staff_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."stock_movements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_movements_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."tax_rates" TO "anon";
GRANT ALL ON TABLE "public"."tax_rates" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."tax_rates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tax_rates_id_seq" TO "authenticated";


































