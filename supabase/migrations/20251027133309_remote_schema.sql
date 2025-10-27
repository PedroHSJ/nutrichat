create sequence "public"."subscription_reconciliation_audit_id_seq";

create table "public"."admin_sessions" (
    "token_hash" text not null,
    "created_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null,
    "revoked_at" timestamp with time zone,
    "ip" text,
    "user_agent" text
);


create table "public"."chats" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "title_encrypted" text not null,
    "title_hash" text not null,
    "message_count" integer default 0,
    "auto_delete_at" timestamp with time zone default (now() + '90 days'::interval)
);


alter table "public"."chats" enable row level security;

create table "public"."daily_interaction_usage" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "user_id" uuid,
    "subscription_id" uuid,
    "usage_date" date not null,
    "interactions_used" integer default 0,
    "daily_limit" integer not null
);


alter table "public"."daily_interaction_usage" enable row level security;

create table "public"."messages" (
    "id" uuid not null default uuid_generate_v4(),
    "chat_id" uuid,
    "created_at" timestamp with time zone default now(),
    "content_encrypted" text not null,
    "content_hash" text not null,
    "role" text not null,
    "category" text default 'general'::text
);


alter table "public"."messages" enable row level security;

create table "public"."stripe_webhook_events" (
    "id" text not null,
    "type" text not null,
    "stripe_created_at" timestamp with time zone,
    "received_at" timestamp with time zone not null default now(),
    "processed_at" timestamp with time zone,
    "status" text not null default 'pending'::text,
    "error" text,
    "payload" jsonb not null
);


create table "public"."subscription_plan_prices" (
    "id" uuid not null default uuid_generate_v4(),
    "plan_id" uuid not null,
    "stripe_price_id" text not null,
    "amount_cents" integer not null,
    "currency" text not null,
    "billing_interval" text not null,
    "is_current" boolean default false,
    "created_at" timestamp with time zone default now(),
    "deprecated_at" timestamp with time zone
);


create table "public"."subscription_plans" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "stripe_product_id" text not null,
    "daily_interactions_limit" integer not null,
    "features" jsonb default '[]'::jsonb,
    "active" boolean default true
);


alter table "public"."subscription_plans" enable row level security;

create table "public"."subscription_reconciliation_audit" (
    "id" bigint not null default nextval('subscription_reconciliation_audit_id_seq'::regclass),
    "created_at" timestamp with time zone not null default now(),
    "action" text not null,
    "stripe_subscription_id" text not null,
    "stripe_customer_id" text,
    "user_id" uuid,
    "plan_id" uuid,
    "status_stripe" text,
    "status_db" text,
    "period_end_stripe" timestamp with time zone,
    "period_end_db" timestamp with time zone,
    "dry_run" boolean default false,
    "reason" text,
    "error" text
);


create table "public"."user_profiles" (
    "id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "name" text not null,
    "email" text not null,
    "consent_given" boolean default false,
    "consent_date" timestamp with time zone,
    "data_retention_until" timestamp with time zone default (now() + '2 years'::interval),
    "timezone" text default 'America/Sao_Paulo'::text,
    "language" text default 'pt'::text,
    "last_login" timestamp with time zone,
    "login_count" integer default 0
);


create table "public"."user_subscriptions" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "user_id" uuid,
    "plan_id" uuid,
    "stripe_customer_id" text not null,
    "stripe_subscription_id" text not null,
    "status" text not null,
    "current_period_start" timestamp with time zone not null,
    "current_period_end" timestamp with time zone not null,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."user_subscriptions" enable row level security;

alter sequence "public"."subscription_reconciliation_audit_id_seq" owned by "public"."subscription_reconciliation_audit"."id";

CREATE UNIQUE INDEX admin_sessions_pkey ON public.admin_sessions USING btree (token_hash);

CREATE UNIQUE INDEX chats_pkey ON public.chats USING btree (id);

CREATE UNIQUE INDEX daily_interaction_usage_pkey ON public.daily_interaction_usage USING btree (id);

CREATE UNIQUE INDEX daily_interaction_usage_user_id_usage_date_key ON public.daily_interaction_usage USING btree (user_id, usage_date);

CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions USING btree (expires_at);

CREATE INDEX idx_chats_updated_at ON public.chats USING btree (updated_at DESC);

CREATE INDEX idx_chats_user_id ON public.chats USING btree (user_id);

CREATE INDEX idx_daily_usage_date ON public.daily_interaction_usage USING btree (usage_date);

CREATE INDEX idx_daily_usage_subscription ON public.daily_interaction_usage USING btree (subscription_id);

CREATE INDEX idx_daily_usage_user_date ON public.daily_interaction_usage USING btree (user_id, usage_date);

CREATE INDEX idx_messages_category ON public.messages USING btree (category);

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);

CREATE INDEX idx_stripe_webhook_events_received ON public.stripe_webhook_events USING btree (received_at);

CREATE INDEX idx_stripe_webhook_events_status ON public.stripe_webhook_events USING btree (status);

CREATE INDEX idx_subscription_plan_prices_plan ON public.subscription_plan_prices USING btree (plan_id);

CREATE INDEX idx_subscription_plans_active ON public.subscription_plans USING btree (active);

CREATE INDEX idx_subscription_recon_action ON public.subscription_reconciliation_audit USING btree (action);

CREATE INDEX idx_subscription_recon_created_at ON public.subscription_reconciliation_audit USING btree (created_at);

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);

CREATE INDEX idx_user_subscriptions_period_end ON public.user_subscriptions USING btree (current_period_end);

CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions USING btree (status);

CREATE INDEX idx_user_subscriptions_stripe_customer ON public.user_subscriptions USING btree (stripe_customer_id);

CREATE INDEX idx_user_subscriptions_stripe_subscription ON public.user_subscriptions USING btree (stripe_subscription_id);

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions USING btree (user_id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX stripe_webhook_events_pkey ON public.stripe_webhook_events USING btree (id);

CREATE UNIQUE INDEX subscription_plan_prices_pkey ON public.subscription_plan_prices USING btree (id);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX subscription_plans_slug_key ON public.subscription_plans USING btree (slug);

CREATE UNIQUE INDEX subscription_plans_stripe_product_id_key ON public.subscription_plans USING btree (stripe_product_id);

CREATE UNIQUE INDEX subscription_reconciliation_audit_pkey ON public.subscription_reconciliation_audit USING btree (id);

CREATE UNIQUE INDEX uidx_subscription_plan_prices_current ON public.subscription_plan_prices USING btree (plan_id) WHERE is_current;

CREATE UNIQUE INDEX uidx_subscription_plan_prices_stripe_price ON public.subscription_plan_prices USING btree (stripe_price_id);

CREATE UNIQUE INDEX user_profiles_email_key ON public.user_profiles USING btree (email);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_subscriptions_pkey ON public.user_subscriptions USING btree (id);

CREATE UNIQUE INDEX user_subscriptions_stripe_subscription_id_key ON public.user_subscriptions USING btree (stripe_subscription_id);

alter table "public"."admin_sessions" add constraint "admin_sessions_pkey" PRIMARY KEY using index "admin_sessions_pkey";

alter table "public"."chats" add constraint "chats_pkey" PRIMARY KEY using index "chats_pkey";

alter table "public"."daily_interaction_usage" add constraint "daily_interaction_usage_pkey" PRIMARY KEY using index "daily_interaction_usage_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."stripe_webhook_events" add constraint "stripe_webhook_events_pkey" PRIMARY KEY using index "stripe_webhook_events_pkey";

alter table "public"."subscription_plan_prices" add constraint "subscription_plan_prices_pkey" PRIMARY KEY using index "subscription_plan_prices_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."subscription_reconciliation_audit" add constraint "subscription_reconciliation_audit_pkey" PRIMARY KEY using index "subscription_reconciliation_audit_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_pkey" PRIMARY KEY using index "user_subscriptions_pkey";

alter table "public"."chats" add constraint "chats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."chats" validate constraint "chats_user_id_fkey";

alter table "public"."daily_interaction_usage" add constraint "daily_interaction_usage_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE not valid;

alter table "public"."daily_interaction_usage" validate constraint "daily_interaction_usage_subscription_id_fkey";

alter table "public"."daily_interaction_usage" add constraint "daily_interaction_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."daily_interaction_usage" validate constraint "daily_interaction_usage_user_id_fkey";

alter table "public"."daily_interaction_usage" add constraint "daily_interaction_usage_user_id_usage_date_key" UNIQUE using index "daily_interaction_usage_user_id_usage_date_key";

alter table "public"."messages" add constraint "messages_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_chat_id_fkey";

alter table "public"."messages" add constraint "messages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_role_check";

alter table "public"."subscription_plan_prices" add constraint "subscription_plan_prices_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE not valid;

alter table "public"."subscription_plan_prices" validate constraint "subscription_plan_prices_plan_id_fkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_slug_key" UNIQUE using index "subscription_plans_slug_key";

alter table "public"."subscription_plans" add constraint "subscription_plans_stripe_product_id_key" UNIQUE using index "subscription_plans_stripe_product_id_key";

alter table "public"."user_profiles" add constraint "user_profiles_email_key" UNIQUE using index "user_profiles_email_key";

alter table "public"."user_profiles" add constraint "user_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_plan_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'past_due'::text, 'trialing'::text, 'unpaid'::text, 'paused'::text]))) not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_status_check";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_stripe_subscription_id_key" UNIQUE using index "user_subscriptions_stripe_subscription_id_key";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_user_interact_with_subscription(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

create or replace view "public"."chat_analytics" as  SELECT date_trunc('day'::text, created_at) AS date,
    count(*) AS new_chats,
    avg(message_count) AS avg_messages_per_chat
   FROM chats
  GROUP BY (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC;


CREATE OR REPLACE FUNCTION public.cleanup_admin_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  delete from admin_sessions where expires_at < now() or revoked_at is not null;
end;$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_data(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_single_current_price_per_plan()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_current THEN
    -- Mark other versions as non-current for the same plan
    UPDATE public.subscription_plan_prices
      SET is_current = false, deprecated_at = now()
      WHERE plan_id = NEW.plan_id AND id <> NEW.id AND is_current = true;
    -- Do NOT try to update subscription_plans table
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.export_user_data(user_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_active_subscription(user_id uuid)
 RETURNS user_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_id UUID;
BEGIN
    -- Buscar o usuário na tabela auth.users
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
    
    -- Retornar o ID do usuário ou NULL se não encontrado
    RETURN user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_daily_interaction_usage(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.process_invoice_payment_succeeded(p_event_id text, p_event_type text, p_stripe_created_at timestamp with time zone, p_invoice jsonb, p_subscription jsonb, p_user_id uuid, p_plan_id uuid, p_stripe_customer_id text, p_stripe_subscription_id text, p_status text, p_current_period_start timestamp with time zone, p_current_period_end timestamp with time zone, p_trial_start timestamp with time zone, p_trial_end timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_existing_status text;
BEGIN
  INSERT INTO public.stripe_webhook_events(id, type, stripe_created_at, received_at, status, payload)
  VALUES (p_event_id, p_event_type, p_stripe_created_at, now(), 'pending', jsonb_build_object('invoice', p_invoice, 'subscription', p_subscription))
  ON CONFLICT (id) DO NOTHING;

  SELECT status INTO v_existing_status FROM public.stripe_webhook_events WHERE id = p_event_id;
  IF v_existing_status = 'processed' THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_stripe_subscription_id));

  INSERT INTO public.user_subscriptions (
    user_id, plan_id, stripe_customer_id, stripe_subscription_id, status,
    current_period_start, current_period_end, trial_start, trial_end, metadata, created_at, updated_at
  ) VALUES (
    p_user_id, p_plan_id, p_stripe_customer_id, p_stripe_subscription_id, p_status,
    p_current_period_start, p_current_period_end, p_trial_start, p_trial_end, '{}', now(), now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    updated_at = now();

  UPDATE public.stripe_webhook_events
    SET status = 'processed', processed_at = now()
  WHERE id = p_event_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.stripe_webhook_events
    SET status = 'failed', error = left(SQLERRM, 500)
  WHERE id = p_event_id;
  RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.subscription_status_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  result jsonb := '{}';
  rec record;
begin
  for rec in select status, count(*) as c from user_subscriptions group by status loop
    result := result || jsonb_build_object(rec.status, rec.c);
  end loop;
  return result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.update_chat_message_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_login()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.user_profiles
  SET 
    last_login = NOW(),
    login_count = login_count + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."admin_sessions" to "anon";

grant insert on table "public"."admin_sessions" to "anon";

grant references on table "public"."admin_sessions" to "anon";

grant select on table "public"."admin_sessions" to "anon";

grant trigger on table "public"."admin_sessions" to "anon";

grant truncate on table "public"."admin_sessions" to "anon";

grant update on table "public"."admin_sessions" to "anon";

grant delete on table "public"."admin_sessions" to "authenticated";

grant insert on table "public"."admin_sessions" to "authenticated";

grant references on table "public"."admin_sessions" to "authenticated";

grant select on table "public"."admin_sessions" to "authenticated";

grant trigger on table "public"."admin_sessions" to "authenticated";

grant truncate on table "public"."admin_sessions" to "authenticated";

grant update on table "public"."admin_sessions" to "authenticated";

grant delete on table "public"."admin_sessions" to "service_role";

grant insert on table "public"."admin_sessions" to "service_role";

grant references on table "public"."admin_sessions" to "service_role";

grant select on table "public"."admin_sessions" to "service_role";

grant trigger on table "public"."admin_sessions" to "service_role";

grant truncate on table "public"."admin_sessions" to "service_role";

grant update on table "public"."admin_sessions" to "service_role";

grant delete on table "public"."chats" to "anon";

grant insert on table "public"."chats" to "anon";

grant references on table "public"."chats" to "anon";

grant select on table "public"."chats" to "anon";

grant trigger on table "public"."chats" to "anon";

grant truncate on table "public"."chats" to "anon";

grant update on table "public"."chats" to "anon";

grant delete on table "public"."chats" to "authenticated";

grant insert on table "public"."chats" to "authenticated";

grant references on table "public"."chats" to "authenticated";

grant select on table "public"."chats" to "authenticated";

grant trigger on table "public"."chats" to "authenticated";

grant truncate on table "public"."chats" to "authenticated";

grant update on table "public"."chats" to "authenticated";

grant delete on table "public"."chats" to "service_role";

grant insert on table "public"."chats" to "service_role";

grant references on table "public"."chats" to "service_role";

grant select on table "public"."chats" to "service_role";

grant trigger on table "public"."chats" to "service_role";

grant truncate on table "public"."chats" to "service_role";

grant update on table "public"."chats" to "service_role";

grant delete on table "public"."daily_interaction_usage" to "anon";

grant insert on table "public"."daily_interaction_usage" to "anon";

grant references on table "public"."daily_interaction_usage" to "anon";

grant select on table "public"."daily_interaction_usage" to "anon";

grant trigger on table "public"."daily_interaction_usage" to "anon";

grant truncate on table "public"."daily_interaction_usage" to "anon";

grant update on table "public"."daily_interaction_usage" to "anon";

grant delete on table "public"."daily_interaction_usage" to "authenticated";

grant insert on table "public"."daily_interaction_usage" to "authenticated";

grant references on table "public"."daily_interaction_usage" to "authenticated";

grant select on table "public"."daily_interaction_usage" to "authenticated";

grant trigger on table "public"."daily_interaction_usage" to "authenticated";

grant truncate on table "public"."daily_interaction_usage" to "authenticated";

grant update on table "public"."daily_interaction_usage" to "authenticated";

grant delete on table "public"."daily_interaction_usage" to "service_role";

grant insert on table "public"."daily_interaction_usage" to "service_role";

grant references on table "public"."daily_interaction_usage" to "service_role";

grant select on table "public"."daily_interaction_usage" to "service_role";

grant trigger on table "public"."daily_interaction_usage" to "service_role";

grant truncate on table "public"."daily_interaction_usage" to "service_role";

grant update on table "public"."daily_interaction_usage" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."stripe_webhook_events" to "anon";

grant insert on table "public"."stripe_webhook_events" to "anon";

grant references on table "public"."stripe_webhook_events" to "anon";

grant select on table "public"."stripe_webhook_events" to "anon";

grant trigger on table "public"."stripe_webhook_events" to "anon";

grant truncate on table "public"."stripe_webhook_events" to "anon";

grant update on table "public"."stripe_webhook_events" to "anon";

grant delete on table "public"."stripe_webhook_events" to "authenticated";

grant insert on table "public"."stripe_webhook_events" to "authenticated";

grant references on table "public"."stripe_webhook_events" to "authenticated";

grant select on table "public"."stripe_webhook_events" to "authenticated";

grant trigger on table "public"."stripe_webhook_events" to "authenticated";

grant truncate on table "public"."stripe_webhook_events" to "authenticated";

grant update on table "public"."stripe_webhook_events" to "authenticated";

grant delete on table "public"."stripe_webhook_events" to "service_role";

grant insert on table "public"."stripe_webhook_events" to "service_role";

grant references on table "public"."stripe_webhook_events" to "service_role";

grant select on table "public"."stripe_webhook_events" to "service_role";

grant trigger on table "public"."stripe_webhook_events" to "service_role";

grant truncate on table "public"."stripe_webhook_events" to "service_role";

grant update on table "public"."stripe_webhook_events" to "service_role";

grant delete on table "public"."subscription_plan_prices" to "anon";

grant insert on table "public"."subscription_plan_prices" to "anon";

grant references on table "public"."subscription_plan_prices" to "anon";

grant select on table "public"."subscription_plan_prices" to "anon";

grant trigger on table "public"."subscription_plan_prices" to "anon";

grant truncate on table "public"."subscription_plan_prices" to "anon";

grant update on table "public"."subscription_plan_prices" to "anon";

grant delete on table "public"."subscription_plan_prices" to "authenticated";

grant insert on table "public"."subscription_plan_prices" to "authenticated";

grant references on table "public"."subscription_plan_prices" to "authenticated";

grant select on table "public"."subscription_plan_prices" to "authenticated";

grant trigger on table "public"."subscription_plan_prices" to "authenticated";

grant truncate on table "public"."subscription_plan_prices" to "authenticated";

grant update on table "public"."subscription_plan_prices" to "authenticated";

grant delete on table "public"."subscription_plan_prices" to "service_role";

grant insert on table "public"."subscription_plan_prices" to "service_role";

grant references on table "public"."subscription_plan_prices" to "service_role";

grant select on table "public"."subscription_plan_prices" to "service_role";

grant trigger on table "public"."subscription_plan_prices" to "service_role";

grant truncate on table "public"."subscription_plan_prices" to "service_role";

grant update on table "public"."subscription_plan_prices" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

grant delete on table "public"."subscription_reconciliation_audit" to "anon";

grant insert on table "public"."subscription_reconciliation_audit" to "anon";

grant references on table "public"."subscription_reconciliation_audit" to "anon";

grant select on table "public"."subscription_reconciliation_audit" to "anon";

grant trigger on table "public"."subscription_reconciliation_audit" to "anon";

grant truncate on table "public"."subscription_reconciliation_audit" to "anon";

grant update on table "public"."subscription_reconciliation_audit" to "anon";

grant delete on table "public"."subscription_reconciliation_audit" to "authenticated";

grant insert on table "public"."subscription_reconciliation_audit" to "authenticated";

grant references on table "public"."subscription_reconciliation_audit" to "authenticated";

grant select on table "public"."subscription_reconciliation_audit" to "authenticated";

grant trigger on table "public"."subscription_reconciliation_audit" to "authenticated";

grant truncate on table "public"."subscription_reconciliation_audit" to "authenticated";

grant update on table "public"."subscription_reconciliation_audit" to "authenticated";

grant delete on table "public"."subscription_reconciliation_audit" to "service_role";

grant insert on table "public"."subscription_reconciliation_audit" to "service_role";

grant references on table "public"."subscription_reconciliation_audit" to "service_role";

grant select on table "public"."subscription_reconciliation_audit" to "service_role";

grant trigger on table "public"."subscription_reconciliation_audit" to "service_role";

grant truncate on table "public"."subscription_reconciliation_audit" to "service_role";

grant update on table "public"."subscription_reconciliation_audit" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

grant delete on table "public"."user_subscriptions" to "anon";

grant insert on table "public"."user_subscriptions" to "anon";

grant references on table "public"."user_subscriptions" to "anon";

grant select on table "public"."user_subscriptions" to "anon";

grant trigger on table "public"."user_subscriptions" to "anon";

grant truncate on table "public"."user_subscriptions" to "anon";

grant update on table "public"."user_subscriptions" to "anon";

grant delete on table "public"."user_subscriptions" to "authenticated";

grant insert on table "public"."user_subscriptions" to "authenticated";

grant references on table "public"."user_subscriptions" to "authenticated";

grant select on table "public"."user_subscriptions" to "authenticated";

grant trigger on table "public"."user_subscriptions" to "authenticated";

grant truncate on table "public"."user_subscriptions" to "authenticated";

grant update on table "public"."user_subscriptions" to "authenticated";

grant delete on table "public"."user_subscriptions" to "service_role";

grant insert on table "public"."user_subscriptions" to "service_role";

grant references on table "public"."user_subscriptions" to "service_role";

grant select on table "public"."user_subscriptions" to "service_role";

grant trigger on table "public"."user_subscriptions" to "service_role";

grant truncate on table "public"."user_subscriptions" to "service_role";

grant update on table "public"."user_subscriptions" to "service_role";

create policy "Usuários podem atualizar apenas seus próprios chats"
on "public"."chats"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Usuários podem deletar apenas seus próprios chats"
on "public"."chats"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Usuários podem inserir apenas seus próprios chats"
on "public"."chats"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Usuários podem ver apenas seus próprios chats"
on "public"."chats"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Sistema pode atualizar uso diário"
on "public"."daily_interaction_usage"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Sistema pode inserir uso diário"
on "public"."daily_interaction_usage"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Usuários podem ver apenas seu próprio uso"
on "public"."daily_interaction_usage"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Usuários podem atualizar mensagens de seus próprios chats"
on "public"."messages"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


create policy "Usuários podem deletar mensagens de seus próprios chats"
on "public"."messages"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


create policy "Usuários podem inserir mensagens em seus próprios chats"
on "public"."messages"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


create policy "Usuários podem ver mensagens de seus próprios chats"
on "public"."messages"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


create policy "Qualquer usuário pode ver planos ativos"
on "public"."subscription_plans"
as permissive
for select
to public
using ((active = true));


create policy "Sistema pode atualizar assinaturas"
on "public"."user_subscriptions"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Sistema pode inserir assinaturas"
on "public"."user_subscriptions"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Usuários podem ver apenas suas próprias assinaturas"
on "public"."user_subscriptions"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at BEFORE UPDATE ON public.daily_interaction_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_count AFTER INSERT OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_chat_message_count();

CREATE TRIGGER trg_ensure_single_current_price AFTER INSERT OR UPDATE ON public.subscription_plan_prices FOR EACH ROW EXECUTE FUNCTION ensure_single_current_price_per_plan();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_user_login AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW WHEN ((old.last_sign_in_at IS DISTINCT FROM new.last_sign_in_at)) EXECUTE FUNCTION update_user_login();


