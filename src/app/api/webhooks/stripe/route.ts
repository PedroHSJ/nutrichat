import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { SubscriptionService, stripe } from "@/lib/stripe";
import { UserSubscriptionService } from "@/lib/subscription";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * Webhook para receber eventos do Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("[Webhook] Signature não encontrada");
      return NextResponse.json(
        { error: "Signature não encontrada" },
        { status: 400 },
      );
    }

    // Verificar webhook
    let event: Stripe.Event;
    try {
      event = SubscriptionService.verifyWebhook(body, signature);
    } catch (error) {
      console.error("[Webhook] Erro na verificação:", error);
      return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
    }

    console.log(`[Webhook] Evento recebido: ${event.type}`);

    // Processar eventos relevantes
    switch (event.type) {
      // REMOVIDO: checkout.session.completed - causava duplicatas
      // Usar apenas invoice.payment_succeeded que é mais confiável

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded":
        // 🎯 LOCAL PRINCIPAL DE CRIAÇÃO DE SUBSCRIPTIONS
        // Este é o webhook mais confiável para confirmar pagamentos
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Evento não tratado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Erro ao processar:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
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
      subscription,
    );

    console.log(`[Webhook] Dados da subscription atualizados no banco`);
  } catch (error) {
    console.error("[Webhook] Erro ao atualizar subscription:", error);
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
      subscription,
    );

    console.log(`[Webhook] Subscription marcada como cancelada no banco`);
  } catch (error) {
    console.error("[Webhook] Erro ao processar cancelamento:", error);
  }
}

/**
 * Processar falha de pagamento
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Pagamento falhou para invoice: ${invoice.id}`);

    const subscriptionId =
      "subscription" in invoice ? invoice.subscription : null;
    if (subscriptionId && typeof subscriptionId === "string") {
      // Buscar subscription e atualizar status
      const subscription =
        await SubscriptionService.getSubscription(subscriptionId);

      await UserSubscriptionService.updateSubscription(
        subscription.id,
        subscription,
      );

      console.log(
        `[Webhook] Status da subscription atualizado após falha de pagamento`,
      );
    }
  } catch (error) {
    console.error("[Webhook] Erro ao processar falha de pagamento:", error);
  }
}

/**
 * Processar pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Pagamento bem-sucedido para invoice: ${invoice.id}`);

    const subscriptionId =
      "subscription" in invoice ? invoice.subscription : null;
    if (!subscriptionId || typeof subscriptionId !== "string") {
      console.log(
        `[Webhook] Invoice ${invoice.id} não está associada a uma subscription`,
      );
      return;
    }

    // Buscar subscription completa no Stripe
    const subscription =
      await SubscriptionService.getSubscription(subscriptionId);

    // Verificar se a subscription já existe no banco
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    if (!supabaseAdmin) {
      console.error("[Webhook] Supabase admin não configurado");
      return;
    }
    console.log(
      `[Webhook] Verificando existência da subscription no banco: ${subscription.id}`,
    );
    const { data: existingSubscription } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .not("status", "eq", "canceled")
      .single();

    if (existingSubscription) {
      // Subscription já existe, apenas atualizar
      await UserSubscriptionService.updateSubscription(
        subscription.id,
        subscription,
      );
      console.log(
        `[Webhook] ✅ Subscription existente atualizada: ${subscription.id}`,
      );
    } else {
      // 🎯 CRIAR NOVA SUBSCRIPTION - Este é agora o local principal
      console.log(
        `[Webhook] 🎯 CRIANDO SUBSCRIPTION PRINCIPAL - invoice.payment_succeeded`,
      );
      console.log(
        `[Webhook] Subscription não existe no banco, criando nova: ${subscription.id}`,
      );

      // Buscar customer no Stripe
      const customer = (await stripe.customers.retrieve(
        subscription.customer as string,
      )) as Stripe.Customer;

      if (!customer.email) {
        console.error(
          "[Webhook] Customer sem email para subscription:",
          subscription.id,
        );
        return;
      }

      // Buscar usuário pelo email
      const userId = await getUserIdByEmail(customer.email);
      if (!userId) {
        console.error(
          `[Webhook] Usuário não encontrado para email: ${customer.email}`,
        );
        return;
      }

      // 🛡️ CAMADA DE SEGURANÇA: Verificar se usuário já tem assinatura ativa
      console.log(
        `[Webhook] Verificando se usuário ${userId} já tem assinatura ativa`,
      );
      const existingUserSubscription =
        await UserSubscriptionService.getUserActiveSubscription(userId);
      if (existingUserSubscription) {
        console.error(
          `[Webhook] ⚠️ BLOQUEADO: Usuário ${userId} já possui assinatura ativa: ${existingUserSubscription.stripe_subscription_id}`,
        );
        console.error(
          `[Webhook] Tentativa de criar assinatura duplicada para subscription: ${subscription.id}`,
        );
        // Cancelar a nova subscription no Stripe para evitar cobrança duplicada
        try {
          await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
            metadata: {
              cancelation_reason: "duplicate_subscription_detected",
              original_subscription_id:
                existingUserSubscription.stripe_subscription_id,
            },
          });
          console.log(
            `[Webhook] Subscription duplicada ${subscription.id} marcada para cancelamento`,
          );
        } catch (cancelError) {
          console.error(
            `[Webhook] Erro ao cancelar subscription duplicada:`,
            cancelError,
          );
        }
        return;
      }

      // Buscar plano baseado no price_id
      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) {
        console.error(
          "[Webhook] Price ID não encontrado na subscription:",
          subscription.id,
        );
        return;
      }

      const planId = await getPlanIdByStripePrice(priceId);
      if (!planId) {
        console.error(
          `[Webhook] Plano não encontrado para price_id: ${priceId}`,
        );
        return;
      }

      // Criar nova subscription no banco
      console.log("[Webhook] Parâmetros da criação:", {
        userId,
        planId,
        customerId: customer.id,
        subscriptionId: subscription.id,
      });

      const createdSubscription =
        await UserSubscriptionService.createSubscription(
          userId,
          planId,
          customer.id,
          subscription.id,
          subscription,
        );

      console.log("[Webhook] ✅ SUBSCRIPTION CRIADA COM SUCESSO!");
      console.log(
        "[Webhook] Dados da subscription criada:",
        createdSubscription,
      );
    }
  } catch (error) {
    console.error("[Webhook] Erro ao processar pagamento bem-sucedido:", error);
  }
}

/**
 * Helper para buscar ID do plano na tabela subscription_plans pelo stripe_price_id
 */
async function getPlanIdByStripePrice(
  stripePriceId: string,
): Promise<string | null> {
  try {
    console.log(
      `[Webhook] Buscando plano por stripe_price_id: ${stripePriceId}`,
    );

    const { supabaseAdmin } = await import("@/lib/supabase-admin");

    if (!supabaseAdmin) {
      console.error("[Webhook] Supabase admin não configurado");
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("stripe_price_id", stripePriceId)
      .eq("active", true)
      .single();

    if (error) {
      console.error(
        "[Webhook] Erro ao buscar plano por stripe_price_id:",
        error,
      );
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("[Webhook] Erro ao buscar plano:", error);
    return null;
  }
}
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    console.log(`[Webhook] Buscando usuário por email: ${email}`);

    // Importar supabaseAdmin para evitar problemas de RLS
    const { supabaseAdmin } = await import("@/lib/supabase-admin");

    if (!supabaseAdmin) {
      console.error("[Webhook] Supabase admin não configurado");
      return null;
    }

    // Usar função RPC para buscar usuário na tabela auth.users
    const { data, error } = await supabaseAdmin.rpc("get_user_id_by_email", {
      user_email: email,
    });

    if (error) {
      console.error("[Webhook] Erro ao buscar usuário por email:", error);
      return null;
    }

    if (!data) {
      console.error(`[Webhook] Usuário não encontrado para email: ${email}`);
      return null;
    }

    console.log(`[Webhook] Usuário encontrado: ${data}`);
    return data;
  } catch (error) {
    console.error("[Webhook] Erro ao buscar usuário por email:", error);
    return null;
  }
}
