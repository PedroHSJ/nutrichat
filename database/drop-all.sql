-- Script para LIMPAR TUDO do banco de dados Supabase
-- ⚠️  CUIDADO: Este script remove TODOS os dados e estruturas
-- Execute apenas se quiser começar do zero!

-- Desabilitar Row Level Security temporariamente
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Remover triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
DROP TRIGGER IF EXISTS update_message_count ON public.messages;

-- Remover políticas RLS
DROP POLICY IF EXISTS "Usuários podem ver apenas seu próprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas seu próprio perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuários podem inserir apenas seu próprio perfil" ON public.user_profiles;

DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios chats" ON public.chats;
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios chats" ON public.chats;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas seus próprios chats" ON public.chats;
DROP POLICY IF EXISTS "Usuários podem deletar apenas seus próprios chats" ON public.chats;

DROP POLICY IF EXISTS "Usuários podem ver mensagens de seus próprios chats" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem inserir mensagens em seus próprios chats" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem atualizar mensagens de seus próprios chats" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem deletar mensagens de seus próprios chats" ON public.messages;

-- Remover funções
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_user_login();
DROP FUNCTION IF EXISTS public.update_chat_message_count();
DROP FUNCTION IF EXISTS public.cleanup_expired_data();
DROP FUNCTION IF EXISTS public.export_user_data(UUID);
DROP FUNCTION IF EXISTS public.delete_user_data(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remover view
DROP VIEW IF EXISTS public.chat_analytics;

-- Remover índices
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_chats_user_id;
DROP INDEX IF EXISTS idx_chats_updated_at;
DROP INDEX IF EXISTS idx_messages_chat_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_timestamp;
DROP INDEX IF EXISTS idx_messages_category;

-- Remover tabelas (ordem importante devido às foreign keys)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Limpar usuários do auth (CUIDADO!)
-- DELETE FROM auth.users WHERE email != 'seu-admin@email.com'; -- Descomente se quiser limpar usuários

-- Confirmar limpeza
SELECT 'Banco de dados limpo com sucesso!' as status;