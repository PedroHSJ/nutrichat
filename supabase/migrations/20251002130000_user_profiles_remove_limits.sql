-- Migration: remove interaction limit fields and plan_type from user_profiles
-- Date: 2025-10-02
-- Description: Drops columns related to interaction limits and plan classification, keeping only consent-related and basic identity fields.

BEGIN;

-- Safety check: only drop if columns exist
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS daily_interactions_count,
  DROP COLUMN IF EXISTS daily_interactions_limit,
  DROP COLUMN IF EXISTS daily_interactions_reset_date,
  DROP COLUMN IF EXISTS plan_type;

COMMIT;

-- Down migration (manual reference): to restore columns if needed
-- ALTER TABLE public.user_profiles
--   ADD COLUMN daily_interactions_count integer DEFAULT 0,
--   ADD COLUMN daily_interactions_limit integer DEFAULT 100,
--   ADD COLUMN daily_interactions_reset_date date DEFAULT CURRENT_DATE,
--   ADD COLUMN plan_type text DEFAULT 'free';
