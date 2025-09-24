import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SubscriptionService, stripe } from '@/lib/stripe';
import { UserSubscriptionService } from '@/lib/subscription';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Webhook para receber eventos do Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] Signature não encontrada');
      return NextResponse.json(
        { error: 'Signature não encontrada' },
        { status: 400 }
      );
    }

    // Verificar webhook
    let event: Stripe.Event;
    try {
      event = SubscriptionService.verifyWebhook(body, signature);
    } catch (error) {
      console.error('[Webhook] Erro na verificação:', error);
      return NextResponse.json(
        { error: 'Webhook inválido' },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Evento recebido: ${event.type}`);

    // Processar eventos relevantes
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Evento não tratado: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Webhook] Erro ao processar:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * Processar checkout completado
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    if (session.mode !== 'subscription' || !session.subscription) {
      return;
    }

    console.log(`[Webhook] Checkout completado para session: ${session.id}`);

    // Buscar a subscription no Stripe para ter dados completos
    const subscription = await SubscriptionService.getSubscription(
      session.subscription as string
    );

    // Buscar informações do customer
    const customer = await stripe.customers.retrieve(
      session.customer as string
    ) as Stripe.Customer;

    if (!customer.email) {
      console.error('[Webhook] Customer sem email');
      return;
    }

    // Buscar usuário pelo email (você pode ajustar isso conforme sua lógica)
    // Por enquanto, vou usar um placeholder
    const userId = await getUserIdByEmail(customer.email);
    if (!userId) {
      console.error(`[Webhook] Usuário não encontrado para email: ${customer.email}`);
      return;
    }

    // Determinar o plano baseado no price_id
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      console.error('[Webhook] Price ID não encontrado');
      return;
    }

    // Buscar ID do plano na tabela subscription_plans
    const planId = await getPlanIdByStripePrice(priceId);
    if (!planId) {
      console.error(`[Webhook] Plano não encontrado na tabela subscription_plans para price_id: ${priceId}`);
      return;
    }

    // Criar assinatura no banco
    await UserSubscriptionService.createSubscription(
      userId,
      planId, // Usar o UUID correto da tabela subscription_plans
      customer.id,
      subscription.id,
      subscription
    );

    console.log(`[Webhook] Assinatura criada para usuário: ${userId}`);

  } catch (error) {
    console.error('[Webhook] Erro ao processar checkout completado:', error);
  }
}

/**
 * Processar atualização de assinatura
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription atualizada: ${subscription.id}`);

    await UserSubscriptionService.updateSubscription(
      subscription.id,
      subscription
    );

    console.log(`[Webhook] Dados da subscription atualizados no banco`);

  } catch (error) {
    console.error('[Webhook] Erro ao atualizar subscription:', error);
  }
}

/**
 * Processar cancelamento de assinatura
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription cancelada: ${subscription.id}`);

    // Marcar como cancelada no banco
    await UserSubscriptionService.updateSubscription(
      subscription.id,
      subscription
    );

    console.log(`[Webhook] Subscription marcada como cancelada no banco`);

  } catch (error) {
    console.error('[Webhook] Erro ao processar cancelamento:', error);
  }
}

/**
 * Processar falha de pagamento
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Pagamento falhou para invoice: ${invoice.id}`);

    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      // Buscar subscription e atualizar status
      const subscription = await SubscriptionService.getSubscription(subscriptionId);

      await UserSubscriptionService.updateSubscription(
        subscription.id,
        subscription
      );

      console.log(`[Webhook] Status da subscription atualizado após falha de pagamento`);
    }

  } catch (error) {
    console.error('[Webhook] Erro ao processar falha de pagamento:', error);
  }
}

/**
 * Processar pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Pagamento bem-sucedido para invoice: ${invoice.id}`);

    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      // Buscar subscription e atualizar status
      const subscription = await SubscriptionService.getSubscription(subscriptionId);

      await UserSubscriptionService.updateSubscription(
        subscription.id,
        subscription
      );

      console.log(`[Webhook] Status da subscription atualizado após pagamento`);
    }

  } catch (error) {
    console.error('[Webhook] Erro ao processar pagamento bem-sucedido:', error);
  }
}

/**
 * Helper para buscar ID do plano na tabela subscription_plans pelo stripe_price_id
 */
async function getPlanIdByStripePrice(stripePriceId: string): Promise<string | null> {
  try {
    console.log(`[Webhook] Buscando plano por stripe_price_id: ${stripePriceId}`);
    
    const { supabase } = await import('@/lib/supabase');
    
    if (!supabase) {
      console.error('[Webhook] Supabase não configurado');
      return null;
    }
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('stripe_price_id', stripePriceId)
      .eq('active', true)
      .single();
    
    if (error) {
      console.error('[Webhook] Erro ao buscar plano por stripe_price_id:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('[Webhook] Erro ao buscar plano:', error);
    return null;
  }
}
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    console.log(`[Webhook] Buscando usuário por email: ${email}`);
    
    // Importar supabase aqui para evitar problemas de importação circular
    const { supabase } = await import('@/lib/supabase');
    
    if (!supabase) {
      console.error('[Webhook] Supabase não configurado');
      return null;
    }
    
    // Buscar usuário na tabela auth.users do Supabase por email
    const { data, error } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('[Webhook] Erro ao buscar usuário por email:', error);
      
      // Se não encontrar na auth.users, tentar buscar em profiles ou outra tabela
      // que você possa ter criado para mapear emails
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
        
      if (profileError) {
        console.error('[Webhook] Usuário não encontrado em profiles também:', profileError);
        return null;
      }
      
      return profileData?.id || null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('[Webhook] Erro ao buscar usuário por email:', error);
    return null;
  }
}