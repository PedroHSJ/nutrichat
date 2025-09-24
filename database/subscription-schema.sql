-- Schema de assinaturas e planos para sistema de recorrência
-- Executa após auth-schema.sql

-- =====================================================
-- TABELA DE PLANOS DE ASSINATURA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados do plano
  name TEXT NOT NULL, -- 'Básico', 'Pro'
  slug TEXT NOT NULL UNIQUE, -- 'basic', 'pro'
  description TEXT,
  
  -- Integração com Stripe
  stripe_product_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL UNIQUE,
  
  -- Limites e pricing
  daily_interactions_limit INTEGER NOT NULL,
  price_cents INTEGER NOT NULL, -- preço em centavos (ex: 1999 = R$ 19,99)
  currency TEXT DEFAULT 'BRL',
  billing_interval TEXT DEFAULT 'month', -- 'month' ou 'year'
  
  -- Features do plano
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  active BOOLEAN DEFAULT true
);

-- =====================================================
-- TABELA DE ASSINATURAS DOS USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Relacionamentos
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  
  -- Integração com Stripe
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  
  -- Status da assinatura (baseado no Stripe)
  status TEXT NOT NULL CHECK (status IN (
    'active', 'canceled', 'incomplete', 'incomplete_expired',
    'past_due', 'trialing', 'unpaid', 'paused'
  )),
  
  -- Datas importantes
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE, -- Agendado para cancelar
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- TABELA DE USO DIÁRIO DE INTERAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_interaction_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Relacionamentos
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  
  -- Data específica (sem hora)
  usage_date DATE NOT NULL,
  
  -- Contadores
  interactions_used INTEGER DEFAULT 0,
  daily_limit INTEGER NOT NULL,
  
  -- Constraint para garantir um registro por usuário por dia
  UNIQUE(user_id, usage_date)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price ON public.subscription_plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(active);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON public.user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON public.user_subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_interaction_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_subscription ON public.daily_interaction_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_interaction_usage(usage_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_interaction_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_plans (leitura pública)
CREATE POLICY "Qualquer usuário pode ver planos ativos"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

-- Políticas para user_subscriptions
CREATE POLICY "Usuários podem ver apenas suas próprias assinaturas"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir assinaturas"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sistema pode atualizar assinaturas"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para daily_interaction_usage
CREATE POLICY "Usuários podem ver apenas seu próprio uso"
  ON public.daily_interaction_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir uso diário"
  ON public.daily_interaction_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sistema pode atualizar uso diário"
  ON public.daily_interaction_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Função para obter assinatura ativa do usuário
CREATE OR REPLACE FUNCTION get_user_active_subscription(user_id UUID)
RETURNS public.user_subscriptions AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode interagir
CREATE OR REPLACE FUNCTION can_user_interact_with_subscription(user_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar uso diário
CREATE OR REPLACE FUNCTION increment_daily_interaction_usage(user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DADOS INICIAIS (PLANOS)
-- =====================================================
INSERT INTO public.subscription_plans (
  name, slug, description, 
  stripe_product_id, stripe_price_id,
  daily_interactions_limit, price_cents,
  features
) VALUES 
(
  'Plano Básico', 
  'basic', 
  'Ideal para uso pessoal com 50 interações diárias',
  'prod_basic_placeholder', -- Substituir pelo ID real do Stripe
  'price_basic_placeholder', -- Substituir pelo ID real do Stripe
  50,
  1999, -- R$ 19,99
  '["50 interações por dia", "Suporte básico", "Histórico de conversas"]'::jsonb
),
(
  'Plano Pro', 
  'pro', 
  'Para uso profissional com 150 interações diárias',
  'prod_pro_placeholder', -- Substituir pelo ID real do Stripe
  'price_pro_placeholder', -- Substituir pelo ID real do Stripe
  150,
  4999, -- R$ 49,99
  '["150 interações por dia", "Suporte prioritário", "Histórico completo", "Exportação de dados", "API access"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  daily_interactions_limit = EXCLUDED.daily_interactions_limit,
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_usage_updated_at
  BEFORE UPDATE ON public.daily_interaction_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();