-- Migration: Add FK to current price version and drop direct price columns
-- Date: 2025-10-01
BEGIN;

-- 1. Add new column referencing current price version
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS current_price_version_id uuid NULL REFERENCES public.subscription_plan_prices(id) ON DELETE SET NULL;

-- 2. Populate with existing current versions if empty
UPDATE public.subscription_plans p
SET current_price_version_id = spp.id
FROM public.subscription_plan_prices spp
WHERE spp.plan_id = p.id AND spp.is_current = true
  AND p.current_price_version_id IS NULL;

-- 3. Ensure uniqueness of stripe_price_id now at version table level
CREATE UNIQUE INDEX IF NOT EXISTS uidx_subscription_plan_prices_stripe_price ON public.subscription_plan_prices(stripe_price_id);

-- 4. If all plans have current_price_version_id, enforce NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_plans WHERE current_price_version_id IS NULL
  ) THEN
    ALTER TABLE public.subscription_plans
      ALTER COLUMN current_price_version_id SET NOT NULL;
  END IF;
END $$;

-- 5. Drop old uniqueness / index tied to removed columns
DROP INDEX IF EXISTS idx_subscription_plans_stripe_price;
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_stripe_price_id_key;

-- 6. Drop deprecated columns (kept logic data now in subscription_plan_prices)
ALTER TABLE public.subscription_plans
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS price_cents,
  DROP COLUMN IF EXISTS billing_interval,
  DROP COLUMN IF EXISTS currency;

COMMIT;
