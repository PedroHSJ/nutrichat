-- Migration: Tabela de versionamento de preços dos planos
-- Data: 2025-10-01
BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_plan_prices (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  stripe_price_id text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  billing_interval text NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  deprecated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_prices_plan ON public.subscription_plan_prices(plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_subscription_plan_prices_current ON public.subscription_plan_prices(plan_id) WHERE is_current;

-- Popular preços atuais existentes (caso ainda não haja linha)
INSERT INTO public.subscription_plan_prices (plan_id, stripe_price_id, amount_cents, currency, billing_interval, is_current)
SELECT p.id, p.stripe_price_id, p.price_cents, COALESCE(p.currency,'BRL'), COALESCE(p.billing_interval,'month'), true
FROM public.subscription_plans p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plan_prices spp WHERE spp.plan_id = p.id AND spp.is_current
);

COMMIT;