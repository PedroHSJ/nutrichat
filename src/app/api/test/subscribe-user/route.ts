import { NextRequest, NextResponse } from 'next/server';
import StripeService from '@/lib/stripe';

/**
 * POST /api/test/subscribe-user
 * Testar criação de assinatura para usuário
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

    const { userId, email, name, planType = 'basic' } = await request.json();

    if (!userId || !email || !name) {
      return NextResponse.json(
        { error: 'User ID, email e nome são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['basic', 'pro'].includes(planType)) {
      return NextResponse.json(
        { error: 'Plan type deve ser "basic" ou "pro"' },
        { status: 400 }
      );
    }

    console.log(`[TEST] Criando assinatura para usuário ${userId} (${email}) - Plano: ${planType}`);

    // Criar cliente no Stripe
    const customer = await StripeService.createStripeCustomer(email, name);
    
    // Buscar os planos disponíveis
    const plans = await StripeService.getAvailablePlans();
    const selectedPlan = plans.find((plan: any) => plan.type === planType);
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: `Plano ${planType} não encontrado` },
        { status: 404 }
      );
    }

    // Criar sessão de checkout
    const successUrl = `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_URL}/pricing`;
    
    const checkoutSession = await StripeService.createCheckoutSession(
      customer.id,
      selectedPlan.priceId,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({
      success: true,
      message: 'Sessão de checkout criada com sucesso',
      customerId: customer.id,
      planType,
      planName: selectedPlan.name,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });

  } catch (error) {
    console.error('[TEST] Erro ao criar assinatura:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}