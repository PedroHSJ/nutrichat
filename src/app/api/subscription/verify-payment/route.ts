import { NextRequest, NextResponse } from 'next/server';
import StripeService, { stripe } from '@/lib/stripe';
import { UserSubscriptionService } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`[STRIPE] Verificando sessão: ${sessionId}`);

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Pagamento não confirmado' },
        { status: 400 }
      );
    }

    // Obter informações do plano
    const subscription = session.subscription as any;
    let planInfo = null;

    if (subscription && subscription.items?.data?.[0]?.price?.id) {
      const priceId = subscription.items.data[0].price.id;
      planInfo = StripeService.getPlanByPriceId(priceId);
    }

    // Preparar dados de resposta
    const responseData = {
      success: true,
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: subscription?.id,
      planName: planInfo?.name || 'Plano Desconhecido',
      planType: planInfo?.type || 'unknown',
      dailyLimit: planInfo?.dailyLimit,
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency?.toUpperCase(),
      nextBilling: subscription?.current_period_end ? 
        new Date(subscription.current_period_end * 1000) : null,
      status: subscription?.status || 'active'
    };

    // FALLBACK: Se temos uma subscription válida, verificar se existe no banco
    // Se não existir, criar como backup (caso webhook tenha falhado)
    if (subscription && subscription.id) {
      try {
        await ensureSubscriptionInDatabase(subscription, session);
      } catch (error) {
        console.error('[STRIPE] Erro no fallback de criação de assinatura:', error);
        // Não falhar a verificação por conta disso, apenas logar
      }
    }

    console.log(`[STRIPE] Pagamento verificado com sucesso:`, responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[STRIPE] Erro ao verificar pagamento:', error);
    
    if (error instanceof Error && error.message.includes('No such checkout session')) {
      return NextResponse.json(
        { error: 'Sessão de checkout não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao verificar pagamento' },
      { status: 500 }
    );
  }
}

/**
 * Helper para garantir que a subscription existe no banco (fallback)
 */
async function ensureSubscriptionInDatabase(subscription: any, session: any) {
  try {
    // Verificar se já existe no banco
    const { supabase } = await import('@/lib/supabase');
    
    if (!supabase) {
      console.log('[STRIPE] Supabase não configurado, pulando fallback');
      return;
    }

    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (existingSubscription) {
      console.log('[STRIPE] Subscription já existe no banco, não é necessário criar');
      return;
    }

    console.log('[STRIPE] Subscription não existe no banco, criando como fallback');

    // Buscar customer no Stripe para obter email
    const customer = await stripe.customers.retrieve(session.customer as string) as any;
    
    if (!customer.email) {
      console.error('[STRIPE] Customer sem email, não é possível criar fallback');
      return;
    }

    // Buscar usuário por email
    const userId = await getUserIdByEmail(customer.email);
    if (!userId) {
      console.error('[STRIPE] Usuário não encontrado para email:', customer.email);
      return;
    }

    // Buscar plano na tabela subscription_plans
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      console.error('[STRIPE] Price ID não encontrado na subscription');
      return;
    }

    const planId = await getPlanIdByStripePrice(priceId);
    if (!planId) {
      console.error('[STRIPE] Plano não encontrado para price_id:', priceId);
      return;
    }

    // Criar subscription no banco como fallback
    await UserSubscriptionService.createSubscription(
      userId,
      planId,
      customer.id,
      subscription.id,
      subscription
    );

    console.log('[STRIPE] Subscription criada como fallback com sucesso');

  } catch (error) {
    console.error('[STRIPE] Erro no fallback de criação:', error);
    throw error;
  }
}

/**
 * Helper para buscar usuário por email (duplicado para evitar dependências)
 */
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    if (!supabase) return null;
    
    // Buscar em profiles primeiro (mais provável)
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();
      
    if (!error && data) {
      return data.id;
    }

    // Se não encontrar, tentar auth.users
    const { data: authData, error: authError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
      
    return authData?.id || null;
  } catch (error) {
    console.error('[STRIPE] Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * Helper para buscar plano por price_id (duplicado para evitar dependências)
 */
async function getPlanIdByStripePrice(stripePriceId: string): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', stripePriceId)
      .eq('active', true)
      .single();
    
    return data?.id || null;
  } catch (error) {
    console.error('[STRIPE] Erro ao buscar plano:', error);
    return null;
  }
}