import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';
import { authService } from '@/lib/auth';

/**
 * POST /api/subscription/cancel
 * Cancela a assinatura do usuário
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await authService.getCurrentSession();
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário não autenticado' 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { immediately = false } = body;

    // Cancelar assinatura
    const success = await UserSubscriptionService.cancelUserSubscription(
      user.id, 
      immediately
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: immediately 
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