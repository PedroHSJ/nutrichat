import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/subscription/status
 * Retorna o status da assinatura do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Pega tokens dos headers da requisição
    const authHeader = request.headers.get('authorization');
    const refreshToken = request.headers.get('x-refresh-token');

    let accessToken = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado (token ausente)' },
        { status: 401 }
      );
    }

    // Cria cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL ou Anon Key não definidos nas variáveis de ambiente');
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Seta sessão manualmente
    const { data: { session }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (error || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado (sessão inválida)' },
        { status: 401 }
      );
    }

    // Obter status completo do usuário
    const interactionStatus = await UserSubscriptionService.canUserInteract(session.user.id);

    // Adicionar elegibilidade de trial se não tiver assinatura ativa ou trial em andamento
    try {
      const hasTrialOrActive = interactionStatus.subscriptionStatus === 'active' || interactionStatus.isTrialing;
      if (!hasTrialOrActive) {
        const isNew = await UserSubscriptionService.isBrandNewCustomer(session.user.id);
        interactionStatus.trialEligible = isNew;
        interactionStatus.trialAlreadyUsed = !isNew;
      } else {
        interactionStatus.trialEligible = false;
        interactionStatus.trialAlreadyUsed = interactionStatus.isTrialing ? false : undefined;
      }
    } catch (e) {
      console.warn('[STATUS] Falha ao determinar elegibilidade de trial:', e);
    }
    console.log(`[API] Status da assinatura para usuário ${session.user.id}:`, interactionStatus);
    
    // Retornar status no formato UserInteractionStatus
    return NextResponse.json(interactionStatus);

  } catch (error) {
    console.error('[API] Erro ao buscar status da assinatura:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao carregar status da assinatura' 
      },
      { status: 500 }
    );
  }
}