import { NextRequest, NextResponse } from "next/server";
import StripeService, { stripe } from "@/lib/stripe";
import { UserSubscriptionService } from "@/lib/subscription";
import Stripe from "stripe";

// Tipos para objetos do Stripe
interface StripeSubscription {
  id: string;
  status: string;
  current_period_end: number;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
}

interface StripeCustomer {
  id: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`[STRIPE] Verificando sessão: ${sessionId}`);

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento não confirmado" },
        { status: 400 }
      );
    }

    // Obter informações do plano
    // Buscar subscription completa se necessário para o fallback
    let fullSubscription: Stripe.Subscription | null = null;
    if (session.subscription) {
      try {
        const { SubscriptionService } = await import("@/lib/stripe");
        if (typeof session.subscription === "string") {
          fullSubscription = await SubscriptionService.getSubscription(
            session.subscription
          );
        } else if (
          typeof session.subscription === "object" &&
          session.subscription.id
        ) {
          // Se já veio expandido como objeto
          fullSubscription = session.subscription as Stripe.Subscription;
        }
      } catch (error) {
        console.error("[STRIPE] Erro ao buscar subscription completa:", error);
      }
    }
    if (!fullSubscription) {
      console.warn(
        "[STRIPE] Nenhuma subscription Stripe encontrada para fallback!"
      );
    }

    const subscription = session.subscription as StripeSubscription | null;
    let planInfo = null;

    if (subscription && subscription.items?.data?.[0]?.price?.id) {
      const priceId = subscription.items.data[0].price.id;
      planInfo = await StripeService.getPlanByPriceId(priceId);
    }

    // Preparar dados de resposta
    const responseData = {
      success: true,
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: subscription?.id,
      planName: planInfo?.name || "Plano Desconhecido",
      planType: planInfo?.slug || "unknown",
      dailyLimit: planInfo?.daily_interactions_limit,
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency?.toUpperCase(),
      nextBilling: subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      status: subscription?.status || "active",
    };

    // FALLBACK: Se temos uma subscription válida, verificar se existe no banco
    // Se não existir, criar como backup (caso webhook tenha falhado)
    if (fullSubscription && fullSubscription.id) {
      try {
        await ensureSubscriptionInDatabase(fullSubscription, session);
      } catch (error) {
        console.error(
          "[STRIPE] Erro crítico no fallback de criação de assinatura:",
          error
        );

        // Se o erro for crítico (dados inválidos), falhar a verificação
        if (
          error instanceof Error &&
          (error.message.includes("não pode ser nulo") ||
            error.message.includes("Campo obrigatório"))
        ) {
          throw new Error(`Erro na criação da assinatura: ${error.message}`);
        }

        // Para outros erros, apenas logar (não bloquear)
        console.warn("[STRIPE] Fallback falhou mas continuando verificação");
      }
    }

    console.log(`[STRIPE] Pagamento verificado com sucesso`);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[STRIPE] Erro ao verificar pagamento:", error);

    if (
      error instanceof Error &&
      error.message.includes("No such checkout session")
    ) {
      return NextResponse.json(
        { error: "Sessão de checkout não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao verificar pagamento" },
      { status: 500 }
    );
  }
}

/**
 * Helper para garantir que a subscription existe no banco (fallback)
 */
async function ensureSubscriptionInDatabase(
  subscription: Stripe.Subscription,
  session: Stripe.Checkout.Session
) {
  try {
    // Verificar se já existe no banco
    const { supabase } = await import("@/lib/supabase");

    if (!supabase) {
      console.log("[STRIPE] Supabase não configurado, pulando fallback");
      return;
    }

    const { data: existingSubscription } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .not("status", "eq", "canceled")
      .single();

    if (existingSubscription) {
      console.log(
        "[STRIPE] ✅ Subscription já existe no banco, não é necessário criar"
      );
      return;
    }

    // ⚠️ FALLBACK: Só chegamos aqui se o webhook checkout.session.completed falhou
    // Isso não deveria ser o fluxo normal, mas é uma segurança
    console.warn(
      "[STRIPE] ⚠️ Subscription não existe no banco - webhook pode ter falhado"
    );
    console.log("[STRIPE] Criando subscription como fallback de segurança");

    // Verificar se customer é um objeto ou ID
    let customer: StripeCustomer;
    if (typeof session.customer === "string") {
      // Se for string, buscar no Stripe
      customer = (await stripe.customers.retrieve(
        session.customer
      )) as StripeCustomer;
    } else {
      // Se já for objeto, usar diretamente
      customer = session.customer as StripeCustomer;
    }

    if (!customer.email) {
      console.error(
        "[STRIPE] Customer sem email, não é possível criar fallback"
      );
      return;
    }

    // Buscar usuário por email
    const userId = await getUserIdByEmail(customer.email);
    if (!userId) {
      console.error(
        "[STRIPE] Usuário não encontrado para email:",
        customer.email
      );
      return;
    }

    // Buscar plano na tabela subscription_plan_prices
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      console.error("[STRIPE] Price ID não encontrado na subscription");
      return;
    }

    const planPrice = await getPlanPriceByStripePrice(priceId);
    if (!planPrice) {
      console.error(
        "[STRIPE] Plano/Preço não encontrado para price_id:",
        priceId
      );
      return;
    }
    const planId = planPrice.plan_id;

    // Criar subscription no banco como fallback
    console.log("[STRIPE] Iniciando criação de subscription como fallback...");
    console.log("[STRIPE] Parâmetros do fallback:", {
      userId,
      planId,
      customerId: customer.id,
      subscriptionId: subscription.id,
    });

    // Inserir na tabela user_subscriptions
    const createdSubscription =
      await UserSubscriptionService.createSubscription(
        userId,
        planId,
        customer.id,
        subscription.id,
        subscription
      );

    console.log("[STRIPE] ✅ Subscription criada como fallback com sucesso!");
    console.log("[STRIPE] Dados da subscription criada:", createdSubscription);
  } catch (error) {
    console.error("[STRIPE] Erro no fallback de criação:", error);
    throw error;
  }
}

/**
 * Helper para buscar usuário por email (duplicado para evitar dependências)
 */
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");

    if (!supabase) return null;

    // Buscar em user_profiles
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!error && data) {
      return data.id;
    }

    console.error("[STRIPE] Usuário não encontrado em user_profiles:", error);
    return null;
  } catch (error) {
    console.error("[STRIPE] Erro ao buscar usuário:", error);
    return null;
  }
}

/**
 * Helper para buscar plano por price_id (duplicado para evitar dependências)
 */
async function getPlanPriceByStripePrice(
  stripePriceId: string
): Promise<{ id: string; plan_id: string } | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    if (!supabase) return null;
    const { data } = await supabase
      .from("subscription_plan_prices")
      .select("id, plan_id")
      .eq("stripe_price_id", stripePriceId)
      .eq("is_current", true)
      .single();
    return data || null;
  } catch (error) {
    console.error("[STRIPE] Erro ao buscar plano/preço:", error);
    return null;
  }
}
