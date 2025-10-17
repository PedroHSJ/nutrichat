import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withChatGuard } from '@/lib/subscription-guard';

const DEFAULT_WORKFLOW_ID = 'wf_68f171e696088190b6593a65b43b40c70a73086338745800';

async function getAuthenticatedUser(request: NextRequest) {
  if (process.env.NODE_ENV === 'development' && process.env.SUBSCRIPTION_BYPASS === 'true') {
    return {
      id: 'dev-user',
      email: 'dev@nutrichat.local',
      name: 'Dev User',
    };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[agent-chat] Supabase credentials not configured.');
      return null;
    }

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
    console.error('[agent-chat] Erro ao validar token Supabase:', error);
    return null;
  }
}

function extractTextFromResponse(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const record = data as Record<string, unknown>;

  if (typeof record.output_text === 'string') {
    return record.output_text;
  }

  const output = record.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (item && typeof item === 'object') {
        const content = (item as Record<string, unknown>).content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block && typeof block === 'object') {
              const blockRecord = block as Record<string, unknown>;
              if (typeof blockRecord.text === 'string') {
                return blockRecord.text;
              }
              if (blockRecord.type === 'output_text' && typeof blockRecord.data === 'string') {
                return blockRecord.data;
              }
            }
          }
        }
      }
    }
  }

  return '';
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : null;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Histórico de mensagens ausente.' }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[agent-chat] OPENAI_API_KEY não configurada.');
      return NextResponse.json(
        { error: 'Configuração da OpenAI ausente no servidor.' },
        { status: 500 }
      );
    }

    const workflowId = process.env.OPENAI_AGENT_WORKFLOW_ID ?? DEFAULT_WORKFLOW_ID;

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'workflows=v1',
      },
      body: JSON.stringify({
        workflow: workflowId,
        input: {
          user,
          messages,
        },
      }),
    });

    if (!openAiResponse.ok) {
      const errorPayload = await openAiResponse.json().catch(() => ({}));
      console.error('[agent-chat] Erro da OpenAI:', errorPayload);
      return NextResponse.json(
        { error: 'Falha ao consultar o assistente da OpenAI.' },
        { status: 502 }
      );
    }

    const payload = await openAiResponse.json();
    const output = extractTextFromResponse(payload);

    if (!output) {
      console.warn('[agent-chat] Resposta vazia recebida do workflow.');
    }

    return NextResponse.json({
      message: output,
      raw: payload,
    });
  } catch (error) {
    console.error('[agent-chat] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a solicitação.' },
      { status: 500 }
    );
  }
}

export const POST = withChatGuard(handler);
