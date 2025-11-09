-- =====================================================
-- Migration: Prevent Multiple Active Subscriptions
-- Description: Adiciona constraints e índices para garantir que um usuário
--              não possa ter múltiplas assinaturas ativas simultaneamente
-- =====================================================

-- 1. Criar índice parcial único para impedir múltiplas assinaturas ativas
-- Este índice garante que só pode existir uma assinatura ativa ou em trial por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription_per_user 
ON user_subscriptions (user_id) 
WHERE status IN ('active', 'trialing');

-- 2. Adicionar comentário documentando a regra
COMMENT ON INDEX idx_unique_active_subscription_per_user IS 
'Garante que cada usuário pode ter apenas uma assinatura ativa ou em trial por vez. Assinaturas canceladas, expiradas ou incomplete não são afetadas.';

-- 3. Criar função para validar antes de inserção/atualização
CREATE OR REPLACE FUNCTION check_single_active_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário já tem uma assinatura ativa/trialing
  IF NEW.status IN ('active', 'trialing') THEN
    IF EXISTS (
      SELECT 1 
      FROM user_subscriptions 
      WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status IN ('active', 'trialing')
        AND current_period_end >= NOW()
    ) THEN
      RAISE EXCEPTION 'Usuário já possui uma assinatura ativa. Cancele a assinatura atual antes de criar uma nova.'
        USING ERRCODE = '23505', -- unique_violation
              HINT = 'Apenas uma assinatura ativa é permitida por usuário';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger que executa a função antes de insert/update
DROP TRIGGER IF EXISTS trigger_check_single_active_subscription ON user_subscriptions;
CREATE TRIGGER trigger_check_single_active_subscription
  BEFORE INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_single_active_subscription();

-- 5. Adicionar comentário na tabela documentando a política
COMMENT ON TABLE user_subscriptions IS 
'Armazena assinaturas de usuários. POLÍTICA: Cada usuário pode ter apenas UMA assinatura ativa ou em trial por vez. Esta regra é aplicada via índice único parcial e trigger de validação.';

-- 6. Criar função para obter assinatura ativa do usuário (helper útil)
DROP FUNCTION IF EXISTS get_user_active_subscription(UUID);
CREATE OR REPLACE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  plan_id UUID,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
    us.plan_id,
    us.stripe_subscription_id,
    us.stripe_customer_id,
    us.status,
    us.current_period_start,
    us.current_period_end,
    us.cancel_at_period_end,
    us.created_at,
    us.updated_at
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
    AND us.current_period_end >= NOW()
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Adicionar permissões para a função
GRANT EXECUTE ON FUNCTION get_user_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_subscription(UUID) TO anon;

-- 8. Log da aplicação da migração
DO $$ 
BEGIN
  RAISE NOTICE 'Migration applied: Multiple active subscriptions prevention';
  RAISE NOTICE '- Unique partial index created on (user_id) for active/trialing status';
  RAISE NOTICE '- Trigger validation function created';
  RAISE NOTICE '- Helper function get_user_active_subscription() created';
END $$;
