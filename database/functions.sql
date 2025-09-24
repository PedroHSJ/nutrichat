-- Função para definir contexto de sessão (necessária para RLS)
CREATE OR REPLACE FUNCTION set_session_context(session_id text)
RETURNS void AS $$
BEGIN
  -- Definir a configuração de sessão
  PERFORM set_config('app.session_id', session_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;