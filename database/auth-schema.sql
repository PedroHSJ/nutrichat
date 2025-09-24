-- Sistema de Autenticação NutriChat com Supabase Auth
-- Este schema substitui o sistema de sessões anônimas por autenticação tradicional

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de perfis de usuário (complementa auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados do perfil
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  
  -- Configurações LGPD
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP WITH TIME ZONE,
  data_retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 years'),
  
  -- Configurações do usuário
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  language TEXT DEFAULT 'pt',
  
  -- Metadados
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  
  -- Controle de interações diárias
  daily_interactions_count INTEGER DEFAULT 0,
  daily_interactions_limit INTEGER DEFAULT 100,
  daily_interactions_reset_date DATE DEFAULT CURRENT_DATE,
  plan_type TEXT DEFAULT 'free' -- free, premium, enterprise
);

-- Tabela de chats (vinculada ao usuário autenticado)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados criptografados
  title_encrypted TEXT NOT NULL,
  title_hash TEXT NOT NULL,
  
  -- Metadados
  message_count INTEGER DEFAULT 0,
  
  -- LGPD - limpeza automática
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- Tabela de mensagens (criptografadas)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados criptografados
  content_encrypted TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  
  -- Metadados
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  
  -- Categorização automática
  category TEXT DEFAULT 'general'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_category ON public.messages(category);

-- Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_profiles
CREATE POLICY "Usuários podem ver apenas seu próprio perfil"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir apenas seu próprio perfil"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para chats
CREATE POLICY "Usuários podem ver apenas seus próprios chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir apenas seus próprios chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas seus próprios chats"
  ON public.chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar apenas seus próprios chats"
  ON public.chats FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para messages
CREATE POLICY "Usuários podem ver mensagens de seus próprios chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir mensagens em seus próprios chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar mensagens de seus próprios chats"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar mensagens de seus próprios chats"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar contador de mensagens
CREATE OR REPLACE FUNCTION update_chat_message_count()
RETURNS TRIGGER AS $$
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
$$ language 'plpgsql';

CREATE TRIGGER update_message_count
  AFTER INSERT OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_message_count();

-- Função para limpeza automática de dados expirados (LGPD)
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
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
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para atualizar login
CREATE OR REPLACE FUNCTION update_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    last_login = NOW(),
    login_count = login_count + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para atualizar login
CREATE TRIGGER on_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_user_login();

-- Função para exportar dados do usuário (LGPD)
CREATE OR REPLACE FUNCTION export_user_data(user_uuid UUID)
RETURNS JSON AS $$
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
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para deletar todos os dados do usuário (LGPD)
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS BOOLEAN AS $$
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
$$ language 'plpgsql' SECURITY DEFINER;

-- View para analytics (opcional, preservando privacidade)
CREATE OR REPLACE VIEW public.chat_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_chats,
  AVG(message_count) as avg_messages_per_chat
FROM public.chats
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Cron job para limpeza automática (se pg_cron estiver disponível)
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');