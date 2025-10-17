import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withChatGuard } from '@/lib/subscription-guard';

const DEFAULT_WORKFLOW_ID =
  process.env.OPENAI_AGENT_WORKFLOW_ID ??
  process.env.NEXT_PUBLIC_OPENAI_AGENT_WORKFLOW_ID ??
  'wf_68f171e696088190b6593a65b43b40c70a73086338745800';
const DEFAULT_DOMAIN_KEY =
  process.env.OPENAI_CHATKIT_DOMAIN_KEY ?? 'nutrichat-agent';

async function getAuthenticatedUser(request: NextRequest) {
  if (process.env.NODE_ENV === 'development' && process.env.SUBSCRIPTION_BYPASS === 'true') {
    return {
      id: 'dev-user',
      email: 'dev@nutrichat.local',
      name: 'Dev User',
    };
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[chatkit/session] Supabase credentials not configured.');
    return null;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? 'usuario@nutrichat.com',
      name: data.user.user_metadata?.name ?? data.user.email ?? 'Usuário NutriChat',
    };
  } catch (error) {
    console.error('[chatkit/session] Erro ao validar token Supabase:', error);
    return null;
  }
}

async function handler(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const workflowId =
      typeof body?.workflowId === 'string' && body.workflowId.length > 0
        ? body.workflowId
        : DEFAULT_WORKFLOW_ID;
    const domainKey =
      typeof body?.domainKey === 'string' && body.domainKey.length > 0
        ? body.domainKey
        : DEFAULT_DOMAIN_KEY;

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const openAiResponse = await fetch(
      `https://api.openai.com/v1/workflows/${workflowId}/sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'workflows=v1',
        },
        body: JSON.stringify({
          session: {
            metadata: {
              user_id: user.id,
              user_email: user.email,
              origin: 'nutrichat.chatkit',
              domain_key: domainKey,
            },
          },
        }),
      }
    );

    if (!openAiResponse.ok) {
      const errorPayload = await openAiResponse.json().catch(() => ({}));
      console.error('[chatkit/session] Erro da OpenAI ao criar sessão:', errorPayload);
      return NextResponse.json(
        { error: 'Falha ao criar sessão do ChatKit na OpenAI.' },
        { status: 502 }
      );
    }

    const payload = await openAiResponse.json();
    const clientSecret =
      payload?.client_secret?.value ??
      payload?.client_secret ??
      payload?.data?.client_secret ??
      null;

    if (!clientSecret) {
      console.error('[chatkit/session] Resposta inesperada ao criar sessão:', payload);
      return NextResponse.json(
        { error: 'Resposta inválida ao criar sessão do ChatKit.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      client_secret: clientSecret,
      workflow_id: workflowId,
      domain_key: domainKey,
    });
  } catch (error) {
    console.error('[chatkit/session] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar sessão do ChatKit.' },
      { status: 500 }
    );
  }
}

export const POST = withChatGuard(handler);
