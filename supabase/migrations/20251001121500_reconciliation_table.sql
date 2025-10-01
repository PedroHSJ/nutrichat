-- Migration: Tabela para auditoria de reconciliações Stripe
-- Data: 2025-10-01
BEGIN;
CREATE TABLE IF NOT EXISTS public.subscription_reconciliation_audit (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL, -- created | updated | skipped | error
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text,
  user_id uuid,
  plan_id uuid,
  status_stripe text,
  status_db text,
  period_end_stripe timestamptz,
  period_end_db timestamptz,
  dry_run boolean DEFAULT false,
  reason text,
  error text
);
CREATE INDEX IF NOT EXISTS idx_subscription_recon_created_at ON public.subscription_reconciliation_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_recon_action ON public.subscription_reconciliation_audit(action);
COMMIT;
