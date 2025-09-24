import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';

/**
 * GET /api/test/user-status/:userId
 * Verificar status de assinatura do usuário
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verificar se está em desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Esta rota está disponível apenas em desenvolvimento' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`[TEST] Verificando status do usuário: ${userId}`);

    // Verificar se pode interagir
    const interactionStatus = await UserSubscriptionService.canUserInteract(userId);
    
    // Obter detalhes completos da assinatura
    const activeSubscription = await UserSubscriptionService.getUserActiveSubscription(userId);
    const dailyUsage = await UserSubscriptionService.getDailyUsage(userId);
    const userStats = await UserSubscriptionService.getUserStats(userId);

    return NextResponse.json({
      success: true,
      userId,
      isDevelopment: process.env.NODE_ENV === 'development',
      canInteract: interactionStatus.canInteract,
      interactionStatus,
      activeSubscription,
      dailyUsage,
      userStats,
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('[TEST] Erro ao verificar status do usuário:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}