-- Tabela de sessões administrativas persistentes
create table if not exists admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip text,
  user_agent text
);

-- Índice para limpeza rápida
create index if not exists idx_admin_sessions_expires_at on admin_sessions(expires_at);

-- Função para limpar expiradas (opcional chamada em cron futuro)
create or replace function cleanup_admin_sessions() returns void as $$
begin
  delete from admin_sessions where expires_at < now() or revoked_at is not null;
end;$$ language plpgsql security definer;

-- RPC agregada de contagem de status das assinaturas
create or replace function subscription_status_counts() returns jsonb as $$
declare
  result jsonb := '{}';
  rec record;
begin
  for rec in select status, count(*) as c from user_subscriptions group by status loop
    result := result || jsonb_build_object(rec.status, rec.c);
  end loop;
  return result;
end;$$ language plpgsql stable;
