-- Migration: Trigger to enforce single current version and sync FK
-- Date: 2025-10-01
BEGIN;

-- Function: before insert/update on subscription_plan_prices
CREATE OR REPLACE FUNCTION public.ensure_single_current_price()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_current THEN
    -- Desmarca outras versões current do mesmo plano
    UPDATE public.subscription_plan_prices
      SET is_current = false, deprecated_at = now()
      WHERE plan_id = NEW.plan_id AND id <> NEW.id AND is_current = true;
    -- Sincroniza FK no plano (caso exista coluna)
    UPDATE public.subscription_plans
      SET current_price_version_id = NEW.id,
          updated_at = now()
      WHERE id = NEW.plan_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger (after para ter NEW.id definido) - usando AFTER INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_subscription_price_version_current ON public.subscription_plan_prices;
CREATE TRIGGER trg_subscription_price_version_current
AFTER INSERT OR UPDATE ON public.subscription_plan_prices
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_current_price();

COMMIT;
