-- Migração para adicionar sistema de limitação de interações diárias
-- Execute este arquivo apenas se você já tem um banco de dados existente

-- Adicionar campos para controle de interações diárias na tabela user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS daily_interactions_count INTEGER DEFAULT 0;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS daily_interactions_limit INTEGER DEFAULT 100;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS daily_interactions_reset_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';

-- Índice para performance nas consultas de limite diário
CREATE INDEX IF NOT EXISTS idx_user_profiles_daily_reset 
ON public.user_profiles(daily_interactions_reset_date, daily_interactions_count);

-- Função para resetar contadores diários automaticamente
CREATE OR REPLACE FUNCTION reset_daily_interactions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles 
  SET 
    daily_interactions_count = 0,
    daily_interactions_reset_date = CURRENT_DATE
  WHERE daily_interactions_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode fazer uma interação
CREATE OR REPLACE FUNCTION can_user_interact(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Buscar dados do usuário
  SELECT 
    daily_interactions_count,
    daily_interactions_limit,
    daily_interactions_reset_date
  INTO user_record
  FROM public.user_profiles
  WHERE id = user_id;
  
  -- Se usuário não encontrado, retornar false
  IF user_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Se a data de reset é anterior à data atual, resetar contador
  IF user_record.daily_interactions_reset_date < CURRENT_DATE THEN
    UPDATE public.user_profiles 
    SET 
      daily_interactions_count = 0,
      daily_interactions_reset_date = CURRENT_DATE
    WHERE id = user_id;
    
    RETURN TRUE;
  END IF;
  
  -- Verificar se ainda tem interações disponíveis
  RETURN user_record.daily_interactions_count < user_record.daily_interactions_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de interações
CREATE OR REPLACE FUNCTION increment_user_interactions(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  can_interact BOOLEAN;
BEGIN
  -- Verificar se pode interagir
  SELECT can_user_interact(user_id) INTO can_interact;
  
  IF NOT can_interact THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementar contador
  UPDATE public.user_profiles 
  SET daily_interactions_count = daily_interactions_count + 1
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar limite de interações (para diferentes planos)
CREATE OR REPLACE FUNCTION update_user_plan(user_id UUID, new_plan_type TEXT, new_limit INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_profiles 
  SET 
    plan_type = new_plan_type,
    daily_interactions_limit = new_limit
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar limpeza automática diária (opcional - requer pg_cron extension)
-- SELECT cron.schedule('reset-daily-interactions', '0 0 * * *', 'SELECT reset_daily_interactions();');