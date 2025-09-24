


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_user_interact_with_subscription"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  subscription RECORD;
  plan RECORD;
  usage RECORD;
  today DATE := CURRENT_DATE;
  result JSONB;
BEGIN
  -- Buscar assinatura ativa
  SELECT * INTO subscription
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = can_user_interact_with_subscription.user_id
    AND status IN ('active', 'trialing')
    AND current_period_end > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se não tem assinatura ativa
  IF subscription IS NULL THEN
    RETURN jsonb_build_object(
      'canInteract', false,
      'reason', 'no_active_subscription',
      'remainingInteractions', 0,
      'dailyLimit', 0,
      'subscriptionStatus', 'inactive'
    );
  END IF;
  
  -- Buscar dados do plano
  SELECT * INTO plan
  FROM public.subscription_plans
  WHERE id = subscription.plan_id;
  
  -- Buscar ou criar registro de uso diário
  SELECT * INTO usage
  FROM public.daily_interaction_usage
  WHERE daily_interaction_usage.user_id = can_user_interact_with_subscription.user_id
    AND usage_date = today;
    
  -- Se não existe registro para hoje, criar
  IF usage IS NULL THEN
    INSERT INTO public.daily_interaction_usage (
      user_id, subscription_id, usage_date, interactions_used, daily_limit
    ) VALUES (
      can_user_interact_with_subscription.user_id, 
      subscription.id, 
      today, 
      0, 
      plan.daily_interactions_limit
    )
    RETURNING * INTO usage;
  END IF;
  
  -- Construir resposta
  result := jsonb_build_object(
    'canInteract', usage.interactions_used < usage.daily_limit,
    'reason', CASE 
      WHEN usage.interactions_used >= usage.daily_limit THEN 'daily_limit_reached'
      ELSE 'ok'
    END,
    'remainingInteractions', GREATEST(0, usage.daily_limit - usage.interactions_used),
    'dailyLimit', usage.daily_limit,
    'subscriptionStatus', subscription.status,
    'planName', plan.name,
    'currentPeriodEnd', subscription.current_period_end,
    'isTrialing', subscription.status = 'trialing',
    'trialEnd', subscription.trial_end
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."can_user_interact_with_subscription"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_data"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar chats expirados
  WITH deleted_chats AS (
    DELETE FROM public.chats 
    WHERE auto_delete_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_chats;
  
  -- Deletar perfis de usuários que solicitaram remoção
  DELETE FROM public.user_profiles 
  WHERE data_retention_until < NOW() 
  AND consent_given = FALSE;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_data"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se é o próprio usuário
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  -- Deletar mensagens (cascata já cuida, mas explícito)
  DELETE FROM public.messages 
  WHERE chat_id IN (
    SELECT id FROM public.chats WHERE user_id = user_uuid
  );
  
  -- Deletar chats
  DELETE FROM public.chats WHERE user_id = user_uuid;
  
  -- Deletar perfil
  DELETE FROM public.user_profiles WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_user_data"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."export_user_data"("user_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_data JSON;
  chats_data JSON;
BEGIN
  -- Verificar se é o próprio usuário
  IF auth.uid() != user_uuid THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  -- Buscar dados do perfil
  SELECT to_json(up.*) INTO user_data
  FROM public.user_profiles up
  WHERE up.id = user_uuid;
  
  -- Buscar chats e mensagens
  SELECT json_agg(
    json_build_object(
      'chat', to_json(c.*),
      'messages', (
        SELECT json_agg(to_json(m.*))
        FROM public.messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at
      )
    )
  ) INTO chats_data
  FROM public.chats c
  WHERE c.user_id = user_uuid
  ORDER BY c.updated_at DESC;
  
  RETURN json_build_object(
    'user_profile', user_data,
    'chats', chats_data,
    'export_date', NOW(),
    'total_chats', (SELECT COUNT(*) FROM public.chats WHERE user_id = user_uuid),
    'total_messages', (SELECT COUNT(*) FROM public.messages m 
                      JOIN public.chats c ON m.chat_id = c.id 
                      WHERE c.user_id = user_uuid)
  );
END;
$$;


ALTER FUNCTION "public"."export_user_data"("user_uuid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "plan_id" "uuid",
    "stripe_customer_id" "text" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "user_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'incomplete'::"text", 'incomplete_expired'::"text", 'past_due'::"text", 'trialing'::"text", 'unpaid'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_active_subscription"("user_id" "uuid") RETURNS "public"."user_subscriptions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  subscription RECORD;
BEGIN
  SELECT * INTO subscription
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = get_user_active_subscription.user_id
    AND status IN ('active', 'trialing')
    AND current_period_end > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN subscription;
END;
$$;


ALTER FUNCTION "public"."get_user_active_subscription"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_daily_interaction_usage"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  usage RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  -- Verificar se pode interagir primeiro
  IF NOT (can_user_interact_with_subscription(user_id)->>'canInteract')::boolean THEN
    RETURN false;
  END IF;
  
  -- Incrementar contador
  UPDATE public.daily_interaction_usage
  SET 
    interactions_used = interactions_used + 1,
    updated_at = NOW()
  WHERE daily_interaction_usage.user_id = increment_daily_interaction_usage.user_id
    AND usage_date = today;
    
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."increment_daily_interaction_usage"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_message_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chats 
    SET message_count = message_count + 1,
        updated_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chats 
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.chat_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_chat_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    last_login = NOW(),
    login_count = login_count + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_login"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title_encrypted" "text" NOT NULL,
    "title_hash" "text" NOT NULL,
    "message_count" integer DEFAULT 0,
    "auto_delete_at" timestamp with time zone DEFAULT ("now"() + '90 days'::interval)
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."chat_analytics" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "date",
    "count"(*) AS "new_chats",
    "avg"("message_count") AS "avg_messages_per_chat"
   FROM "public"."chats"
  GROUP BY ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "public"."chat_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_interaction_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "subscription_id" "uuid",
    "usage_date" "date" NOT NULL,
    "interactions_used" integer DEFAULT 0,
    "daily_limit" integer NOT NULL
);


ALTER TABLE "public"."daily_interaction_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "content_encrypted" "text" NOT NULL,
    "content_hash" "text" NOT NULL,
    "role" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    CONSTRAINT "messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "stripe_product_id" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "daily_interactions_limit" integer NOT NULL,
    "price_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text",
    "billing_interval" "text" DEFAULT 'month'::"text",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "consent_given" boolean DEFAULT false,
    "consent_date" timestamp with time zone,
    "data_retention_until" timestamp with time zone DEFAULT ("now"() + '2 years'::interval),
    "timezone" "text" DEFAULT 'America/Sao_Paulo'::"text",
    "language" "text" DEFAULT 'pt'::"text",
    "last_login" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "daily_interactions_count" integer DEFAULT 0,
    "daily_interactions_limit" integer DEFAULT 100,
    "daily_interactions_reset_date" "date" DEFAULT CURRENT_DATE,
    "plan_type" "text" DEFAULT 'free'::"text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_interaction_usage"
    ADD CONSTRAINT "daily_interaction_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_interaction_usage"
    ADD CONSTRAINT "daily_interaction_usage_user_id_usage_date_key" UNIQUE ("user_id", "usage_date");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_stripe_price_id_key" UNIQUE ("stripe_price_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_stripe_product_id_key" UNIQUE ("stripe_product_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



CREATE INDEX "idx_chats_updated_at" ON "public"."chats" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_chats_user_id" ON "public"."chats" USING "btree" ("user_id");



CREATE INDEX "idx_daily_usage_date" ON "public"."daily_interaction_usage" USING "btree" ("usage_date");



CREATE INDEX "idx_daily_usage_subscription" ON "public"."daily_interaction_usage" USING "btree" ("subscription_id");



CREATE INDEX "idx_daily_usage_user_date" ON "public"."daily_interaction_usage" USING "btree" ("user_id", "usage_date");



CREATE INDEX "idx_messages_category" ON "public"."messages" USING "btree" ("category");



CREATE INDEX "idx_messages_chat_id" ON "public"."messages" USING "btree" ("chat_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_subscription_plans_active" ON "public"."subscription_plans" USING "btree" ("active");



CREATE INDEX "idx_subscription_plans_stripe_price" ON "public"."subscription_plans" USING "btree" ("stripe_price_id");



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_subscriptions_period_end" ON "public"."user_subscriptions" USING "btree" ("current_period_end");



CREATE INDEX "idx_user_subscriptions_status" ON "public"."user_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_user_subscriptions_stripe_customer" ON "public"."user_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_user_subscriptions_stripe_subscription" ON "public"."user_subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_chats_updated_at" BEFORE UPDATE ON "public"."chats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_daily_usage_updated_at" BEFORE UPDATE ON "public"."daily_interaction_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_message_count" AFTER INSERT OR DELETE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_message_count"();



CREATE OR REPLACE TRIGGER "update_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_subscriptions_updated_at" BEFORE UPDATE ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_interaction_usage"
    ADD CONSTRAINT "daily_interaction_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_interaction_usage"
    ADD CONSTRAINT "daily_interaction_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Qualquer usuário pode ver planos ativos" ON "public"."subscription_plans" FOR SELECT USING (("active" = true));



CREATE POLICY "Sistema pode atualizar assinaturas" ON "public"."user_subscriptions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Sistema pode atualizar uso diário" ON "public"."daily_interaction_usage" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Sistema pode inserir assinaturas" ON "public"."user_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Sistema pode inserir uso diário" ON "public"."daily_interaction_usage" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar apenas seus próprios chats" ON "public"."chats" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar mensagens de seus próprios chats" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE (("chats"."id" = "messages"."chat_id") AND ("chats"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem deletar apenas seus próprios chats" ON "public"."chats" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem deletar mensagens de seus próprios chats" ON "public"."messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE (("chats"."id" = "messages"."chat_id") AND ("chats"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem inserir apenas seus próprios chats" ON "public"."chats" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem inserir mensagens em seus próprios chats" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE (("chats"."id" = "messages"."chat_id") AND ("chats"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver apenas seu próprio uso" ON "public"."daily_interaction_usage" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver apenas seus próprios chats" ON "public"."chats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver apenas suas próprias assinaturas" ON "public"."user_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver mensagens de seus próprios chats" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE (("chats"."id" = "messages"."chat_id") AND ("chats"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_interaction_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































REVOKE ALL ON FUNCTION "public"."can_user_interact_with_subscription"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_user_interact_with_subscription"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_interact_with_subscription"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_interact_with_subscription"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_data"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_user_data"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_data"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_data"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_data"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."export_user_data"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."export_user_data"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."export_user_data"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_user_data"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_active_subscription"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_active_subscription"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_active_subscription"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_active_subscription"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_daily_interaction_usage"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_daily_interaction_usage"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_interaction_usage"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_interaction_usage"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_chat_message_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_chat_message_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_message_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_user_login"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_user_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_login"() TO "service_role";


















GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."chat_analytics" TO "anon";
GRANT ALL ON TABLE "public"."chat_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."daily_interaction_usage" TO "anon";
GRANT ALL ON TABLE "public"."daily_interaction_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_interaction_usage" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE ALL ON FUNCTIONS FROM PUBLIC;




























RESET ALL;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_user_login AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW WHEN ((old.last_sign_in_at IS DISTINCT FROM new.last_sign_in_at)) EXECUTE FUNCTION update_user_login();


