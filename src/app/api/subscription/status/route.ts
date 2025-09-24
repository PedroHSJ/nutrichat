import { NextRequest, NextResponse } from 'next/server';
import { UserSubscriptionService } from '@/lib/subscription';
import { authService } from '@/lib/auth';

/**
 * GET /api/subscription/status
 * Retorna o status da assinatura do usuário autenticado
 */
export async function GET() {
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

    // Obter status completo do usuário
    const stats = await UserSubscriptionService.getUserStats(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        hasActiveSubscription: stats.hasActiveSubscription,
        subscription: stats.subscription ? {
          id: stats.subscription.id,
          planId: stats.subscription.plan_id,
          status: stats.subscription.status,
          currentPeriodEnd: stats.subscription.current_period_end,
          isTrialing: stats.subscription.status === 'trialing',
          trialEnd: stats.subscription.trial_end,
          canceledAt: stats.subscription.canceled_at,
          cancelAt: stats.subscription.cancel_at,
          plan: stats.subscription.plan
        } : null,
        dailyUsage: stats.dailyUsage ? {
          date: stats.dailyUsage.date,
          used: stats.dailyUsage.interactions_used,
          limit: stats.dailyUsage.daily_limit,
          remaining: stats.dailyUsage.daily_limit - stats.dailyUsage.interactions_used
        } : null,
        interactionStatus: stats.interactionStatus
      }
    });

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