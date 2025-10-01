# Gestão de Sessões Administrativas

Este documento explica por que a tabela `admin_sessions` foi criada, como o mecanismo funciona, vantagens sobre abordagens mais simples e alternativas futuras.

## Contexto
Inicialmente a autenticação de acesso às rotas/páginas administrativas usava:
- Uma senha fixa em variável de ambiente (`ADMIN_PASSWORD`)
- Um cookie derivado da combinação (senha + user-agent)
- Validação puramente estateless (sem persistência)

Apesar de simples, esse modelo apresentava riscos e limitações significativas para evolução segura.

## Problemas do Modelo Inicial
| Problema | Impacto |
|----------|---------|
| Dependência do user-agent | Fácil de forjar / reproduzir sessão |
| Falta de revogação granular | Necessário trocar a senha global para invalidar tudo |
| Sem auditoria | Sem histórico de logins, IP ou origem |
| Sem expiração explícita confiável | Gestão de risco fraca |
| In-memory / derivação determinística | Reinícios invalidam arbitrariamente ou perpetuam sessão sem controle |
| Escala horizontal (multi instância) | Inconsistente, cada processo teria visão distinta |

## Objetivos da Evolução
1. Suporte a revogação de uma sessão específica.
2. Persistência entre deploys / restarts.
3. Base para auditoria mínima (IP, user-agent original, timestamps).
4. Token aleatório de alta entropia (imprevisível, não derivado do user-agent).
5. Hash em repouso (evitar reutilização se banco vazar).
6. Expiração configurável (atual: 8h) por sessão individual.
7. Escalabilidade horizontal transparente.

## Como Funciona Agora
1. Login válido gera um `token` aleatório (`32 bytes` → hex → 64 chars).
2. Um hash `sha256(token)` é armazenado na tabela `admin_sessions` junto com:
   - `expires_at`
   - `ip` (best effort via header `x-forwarded-for`)
   - `user_agent`
3. O cookie `admin_session` guarda APENAS o token em claro.
4. Cada request admin:
   - Lê o token.
   - Hashing novamente → `token_hash`.
   - Valida se há linha não expirada e não revogada.
5. Logout marca `revoked_at`.
6. Limpeza futura (cron) pode chamar `select cleanup_admin_sessions();`.

## Estrutura Criada
```
create table admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip text,
  user_agent text
);
```

Funções auxiliares:
- `cleanup_admin_sessions()`: remove expiradas/revogadas (pode ser agendada).
- `subscription_status_counts()`: agregação de métricas (aproveitada no dashboard admin).

## Fluxo Resumido
```
[Login]
  -> valida senha
  -> gera token
  -> hash(token) persistido
  -> define cookie com token

[Request protegida]
  -> lê cookie
  -> hash(token)
  -> SELECT ... WHERE token_hash = hash AND revoked_at IS NULL AND expires_at > now()
  -> ok / nega acesso

[Logout]
  -> UPDATE revoked_at = now()
```

## Vantagens do Modelo Atual
| Aspecto | Resultado |
|---------|-----------|
| Revogação Seletiva | ✅ `revoked_at` por linha |
| Expiração Controlada | ✅ `expires_at` |
| Auditoria | ✅ IP + user_agent + timestamps |
| Segurança em Vazamento | ✅ Apenas hash, não reutilizável diretamente |
| Escalabilidade | ✅ Qualquer instância valida do mesmo banco |
| Evolutivo | ✅ Pode adicionar: origem geográfica, limite de sessões, rotação |

## Próximos Incrementos Possíveis
| Feature | Descrição |
|---------|-----------|
| Limite de sessões | Ex: manter apenas N últimas; revogar antigas |
| Hash lento | Migrar de sha256 → argon2 / bcrypt (menos risco brute-force) |
| Rotação de tokens | Reemissão parcial antes do vencimento (sliding) |
| Notificação de login | Registrar eventos em outra tabela de auditoria |
| Modo somente IP interno | Bloquear acessos admin externos |
| 2FA opcional | TOTP/Passkey se escopo crescer |
| Assinatura adicional | Encadear HMAC secret + token (defesa contra exfiltração parcial) |

## Quando NÃO Usar Essa Abordagem
Se ambiente for estritamente single-tenant, sem múltiplas instâncias, e a área admin for temporária/descartável, um cookie assinado simples já poderia bastar. Porém, qualquer crescimento (monitoramento de preço, relatórios, ou equipe) já justifica a persistência.

## Alternativas Consideradas
| Alternativa | Vantagem | Limitação |
|-------------|----------|-----------|
| JWT + expiração curta | Simples para stateless | Revogação difícil sem blacklist |
| Cookie HMAC sem tabela | Menos complexidade | Sem revogação / auditoria |
| Redis store | TTL nativo e performance | Requer infra adicional |
| OAuth interno | Segurança elevada | Complexidade alta para caso atual |

## Por Que Implementar Agora
Fazer cedo evita:
- Retrabalho ao adicionar métricas e UI administrativa.
- Migrar sessões ativas para novo formato.
- Aumentar superfície de risco com fluxo ad-hoc improvisado.

## Observações de Segurança
- Hash simples (sha256) é suficiente porque token já é de alta entropia (não é senha humana). Se quiser defesa adicional: adicionar pepper secreto + argon2.
- Logins falhos ainda não têm rate limiting → pode ser adicionado em tabela separada.
- Recomendado servir `/api/admin/*` apenas via HTTPS (já garantido em produção normal). 

## Próximo Passo Sugerido
1. Criar cron (diário) chamando `select cleanup_admin_sessions();`.
2. Adicionar botão de logout visível em todas as páginas admin.
3. (Opcional) Painel de sessões ativas + revogar manualmente.

---
Dúvidas ou deseja simplificar / reverter? Abra uma issue ou solicite ajuste direto.
