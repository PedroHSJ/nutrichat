import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SubscriptionService, stripe } from '@/lib/stripe';
import { UserSubscriptionService } from '@/lib/subscription';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
      // REMOVIDO: checkout.session.completed - causava duplicatas
      // Usar apenas invoice.payment_succeeded que é mais confiável

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

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(event, invoice);
        break; }

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

// Observabilidade:
// - Eventos inseridos com status 'pending' e não processados em X minutos indicam falha/transiente.
// - Eventos com status 'failed' armazenam a mensagem de erro (coluna error) para troubleshooting.
// - Estratégia de dashboard: COUNT(*) por status e idade do evento.

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

    const subscriptionId = 'subscription' in invoice ? invoice.subscription : null;
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
async function handleInvoicePaymentSucceeded(event: Stripe.Event, invoice: Stripe.Invoice) {
  console.log(`[Webhook] Pagamento bem-sucedido (invoice.payment_succeeded) invoice: ${invoice.id}`);
  if (!supabaseAdmin) {
    throw new Error('Supabase admin não configurado');
  }

  const subscriptionId = (invoice as any).subscription as string | undefined;
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    console.log(`[Webhook] Invoice ${invoice.id} sem subscription vinculada`);
    return;
  }

  // Buscar subscription completa no Stripe para capturar dados precisos
  const subscription = await SubscriptionService.getSubscription(subscriptionId);

  // Buscar customer (para email -> user)
  const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
  if (!customer.email) {
    throw new Error(`Customer ${customer.id} sem email`);
  }

  // Resolver userId via RPC existente get_user_id_by_email
  const { data: userIdData, error: userIdError } = await supabaseAdmin.rpc('get_user_id_by_email', { user_email: customer.email });
  if (userIdError || !userIdData) {
    throw new Error(`Usuário não encontrado para email ${customer.email}`);
  }
  const userId: string = userIdData;

  // Price / plano
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    throw new Error(`Price ID não encontrado na subscription ${subscription.id}`);
  }
  const planId = await getPlanIdByStripePrice(priceId);
  if (!planId) {
    throw new Error(`Plano não encontrado para price ${priceId}`);
  }

  // Extrair períodos
  const firstItem = subscription.items.data[0];
  const periodStart = firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000) : null;
  const periodEnd = firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000) : null;
  if (!periodStart || !periodEnd) {
    throw new Error('Períodos da assinatura ausentes');
  }

  // Chamando a função RPC (tudo dentro de transação e idempotente)
  const { error: rpcError } = await supabaseAdmin.rpc('process_invoice_payment_succeeded', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_stripe_created_at: new Date(event.created * 1000).toISOString(),
    p_invoice: invoice as any,
    p_subscription: subscription as any,
    p_user_id: userId,
    p_plan_id: planId,
    p_stripe_customer_id: customer.id,
    p_stripe_subscription_id: subscription.id,
    p_status: SubscriptionService.mapStripeStatus(subscription.status),
    p_current_period_start: periodStart.toISOString(),
    p_current_period_end: periodEnd.toISOString(),
    p_trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    p_trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
  });

  if (rpcError) {
    console.error('[Webhook] Erro RPC process_invoice_payment_succeeded:', rpcError);
    throw new Error(rpcError.message);
  }

  console.log(`[Webhook] ✅ Evento ${event.id} processado via RPC (subscription ${subscription.id})`);
}

/**
 * Helper para buscar ID do plano na tabela subscription_plans pelo stripe_price_id
 */
async function getPlanIdByStripePrice(stripePriceId: string): Promise<string | null> {
  try {
    console.log(`[Webhook] Buscando plano por stripe_price_id: ${stripePriceId}`);
    
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    
    if (!supabaseAdmin) {
      console.error('[Webhook] Supabase admin não configurado');
      return null;
    }
    
    const { data, error } = await supabaseAdmin
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
    
    // Importar supabaseAdmin para evitar problemas de RLS
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    
    if (!supabaseAdmin) {
      console.error('[Webhook] Supabase admin não configurado');
      return null;
    }
    
    // Usar função RPC para buscar usuário na tabela auth.users
    const { data, error } = await supabaseAdmin
      .rpc('get_user_id_by_email', {
        user_email: email
      });
    
    if (error) {
      console.error('[Webhook] Erro ao buscar usuário por email:', error);
      return null;
    }
    
    if (!data) {
      console.error(`[Webhook] Usuário não encontrado para email: ${email}`);
      return null;
    }
    
    console.log(`[Webhook] Usuário encontrado: ${data}`);
    return data;
  } catch (error) {
    console.error('[Webhook] Erro ao buscar usuário por email:', error);
    return null;
  }
}