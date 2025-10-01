import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/subscription/cancel
 * Cancela a assinatura do usuário
 */
export async function POST(request: NextRequest) {
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

    // Cancelar assinatura
    const success = await UserSubscriptionService.cancelUserSubscription(
      session.user.id, 
      true // cancelar imediatamente
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: true 
          ? 'Assinatura cancelada imediatamente' 
          : 'Assinatura será cancelada no final do período atual'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Falha ao cancelar assinatura' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Erro ao cancelar assinatura:', error);
    
    // Tratamento de erros específicos
    if (error instanceof Error) {
      if (error.message.includes('não possui assinatura ativa')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Você não possui uma assinatura ativa para cancelar' 
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno ao cancelar assinatura' 
      },
      { status: 500 }
    );
  }
}