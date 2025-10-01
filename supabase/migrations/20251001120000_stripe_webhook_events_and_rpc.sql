-- Migration: Criar tabela stripe_webhook_events e função process_invoice_payment_succeeded
-- Data: 2025-10-01

BEGIN;

-- 1. Tabela de eventos de webhook
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  stripe_created_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'pending', -- pending | processed | failed
  error text,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON public.stripe_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received ON public.stripe_webhook_events(received_at);

-- 2. Garantir UNIQUE já existente na tabela user_subscriptions (idempotente)
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT IF NOT EXISTS user_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);

-- 3. Função RPC (mesmo conteúdo do arquivo functions para rastreabilidade)
CREATE OR REPLACE FUNCTION public.process_invoice_payment_succeeded(
  p_event_id text,
  p_event_type text,
  p_stripe_created_at timestamptz,
  p_invoice jsonb,
  p_subscription jsonb,
  p_user_id uuid,
  p_plan_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_trial_start timestamptz,
  p_trial_end timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMIT;
