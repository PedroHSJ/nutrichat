-- =============================================
-- NUTRICHAT - SCHEMA DO BANCO SUPABASE
-- Seguindo práticas de LGPD e segurança
-- =============================================

-- Habilitar RLS (Row Level Security) por padrão
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =============================================
-- TABELA DE USUÁRIOS (para LGPD)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados mínimos necessários
  session_id TEXT UNIQUE, -- ID de sessão anônimo
  
  -- LGPD compliance
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP WITH TIME ZONE,
  data_retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Metadados (não identificam o usuário)
  timezone TEXT,
  language TEXT DEFAULT 'pt-BR'
);

-- =============================================
-- TABELA DE CHATS
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Título pode conter informação sensível, então criptografamos
  title_encrypted TEXT, -- Título criptografado
  title_hash TEXT, -- Hash para busca (não reversível)
  
  -- Metadados
  message_count INTEGER DEFAULT 0,
  
  -- LGPD compliance
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- =============================================
-- TABELA DE MENSAGENS
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Conteúdo criptografado para proteção de dados
  content_encrypted TEXT NOT NULL, -- Conteúdo criptografado
  content_hash TEXT, -- Hash para busca/deduplicação
  
  -- Metadados
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  tokens_used INTEGER DEFAULT 0,
  
  -- Análise de sentimento (não identificável)
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  category TEXT -- Categoria nutricional (ex: 'meal_planning', 'nutrition_facts')
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id);
CREATE INDEX IF NOT EXISTS idx_auto_delete ON chats(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- =============================================
-- TRIGGERS PARA AUDITORIA E CLEANUP
-- =============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar contador de mensagens
CREATE OR REPLACE FUNCTION update_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chats SET 
            message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.chat_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chats SET 
            message_count = GREATEST(message_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.chat_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER message_count_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_message_count();

-- =============================================
-- FUNÇÃO DE LIMPEZA AUTOMÁTICA (LGPD)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Deletar chats expirados
    WITH deleted AS (
        DELETE FROM chats 
        WHERE auto_delete_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Deletar usuários sem consentimento há mais de 7 dias
    DELETE FROM users 
    WHERE consent_given = FALSE 
    AND created_at < (NOW() - INTERVAL '7 days');
    
    -- Deletar usuários com dados expirados
    DELETE FROM users 
    WHERE data_retention_until < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política para usuários (apenas seus próprios dados)
CREATE POLICY "Users can only access their own data" ON users
    FOR ALL USING (session_id = current_setting('app.session_id', true));

-- Política para chats (apenas do usuário)
CREATE POLICY "Users can only access their own chats" ON chats
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users 
            WHERE session_id = current_setting('app.session_id', true)
        )
    );

-- Política para mensagens (apenas de chats do usuário)
CREATE POLICY "Users can only access messages from their own chats" ON messages
    FOR ALL USING (
        chat_id IN (
            SELECT c.id FROM chats c 
            JOIN users u ON c.user_id = u.id 
            WHERE u.session_id = current_setting('app.session_id', true)
        )
    );

-- =============================================
-- VIEWS PARA FACILITAR CONSULTAS
-- =============================================

-- View para estatísticas não identificáveis
CREATE OR REPLACE VIEW chat_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_chats,
    AVG(message_count) as avg_messages_per_chat,
    COUNT(CASE WHEN message_count > 0 THEN 1 END) as active_chats
FROM chats 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- =============================================
-- EXTENSÕES NECESSÁRIAS
-- =============================================
-- Para criptografia (caso não esteja habilitada)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =============================================
COMMENT ON TABLE users IS 'Usuários com dados mínimos e compliance LGPD';
COMMENT ON TABLE chats IS 'Conversas com título criptografado e auto-exclusão';
COMMENT ON TABLE messages IS 'Mensagens criptografadas com categorização';
COMMENT ON COLUMN users.session_id IS 'ID de sessão anônimo, não identifica pessoa física';
COMMENT ON COLUMN chats.title_encrypted IS 'Título criptografado para proteção de dados sensíveis';
COMMENT ON COLUMN messages.content_encrypted IS 'Conteúdo criptografado seguindo LGPD';
COMMENT ON FUNCTION cleanup_expired_data IS 'Limpeza automática para compliance LGPD - executar diariamente';