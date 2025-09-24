import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';

/**
 * POST /api/test/consume-interaction
 * Testar consumo de interação
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se está em desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota está disponível apenas em desenvolvimento' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se pode interagir
    const status = await UserSubscriptionService.canUserInteract(userId);
    
    if (!status.canInteract) {
      return NextResponse.json({
        success: false,
        message: 'Usuário não pode interagir',
        reason: 'Limite atingido ou sem assinatura ativa',
        status
      });
    }

    // Simular consumo de interação
    const consumed = await UserSubscriptionService.incrementInteractionUsage(userId);

    if (consumed) {
      // Obter novo status
      const newStatus = await UserSubscriptionService.canUserInteract(userId);
      
      return NextResponse.json({
        success: true,
        message: 'Interação consumida com sucesso',
        statusBefore: status,
        statusAfter: newStatus
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Falha ao consumir interação',
        status
      });
    }

  } catch (error) {
    console.error('[TEST] Erro ao consumir interação:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}