import { NextResponse } from 'next/server';
import StripeService from '@/lib/stripe';

/**
 * GET /api/subscription/plans
 * Retorna todos os planos disponíveis para assinatura
 */
export async function GET() {
  try {
    const plans = await StripeService.getAvailablePlans();
    
    const formattedPlans = plans
      .filter(p => p.priceId) // garante apenas planos com versão atual
      .map((plan) => ({
      type: plan.type,
      name: plan.name,
      dailyLimit: plan.dailyLimit,
      priceId: plan.priceId,
      productId: plan.productId,
      priceCents: plan.priceCents,
      currency: plan.currency || 'brl',
      priceFormatted: `R$ ${(plan.priceCents / 100).toFixed(2).replace('.', ',')}`,
      features: plan.features || []
    }));
    
    return NextResponse.json({
      success: true,
      plans: formattedPlans
    });
  } catch (error) {
    console.error('[API] Erro ao buscar planos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao carregar planos disponíveis' 
      },
      { status: 500 }
    );
  }
}