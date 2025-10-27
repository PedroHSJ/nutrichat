import Stripe from "stripe";
import { SubscriptionConfig } from "@/types/subscription";

// =====================================================
// CONFIGURAÇÃO DO STRIPE
// =====================================================
export const subscriptionConfig: SubscriptionConfig = {
  isDevelopment: process.env.NODE_ENV === "development",
  subscriptionBypass: process.env.SUBSCRIPTION_BYPASS === "true",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  // Removendo plans hardcoded - agora vêm do banco
};

// =====================================================
// INSTÂNCIA DO STRIPE
// =====================================================
const stripeSecretKey = subscriptionConfig.stripeSecretKey;

// Validação para desenvolvimento
if (!stripeSecretKey && process.env.NODE_ENV !== "development") {
  throw new Error("STRIPE_SECRET_KEY is required");
}

// Em desenvolvimento, usar uma chave placeholder se não estiver configurada
const finalStripeKey =
  stripeSecretKey || "sk_test_placeholder_for_development_only";

export const stripe = new Stripe(finalStripeKey, {
  apiVersion: "2025-08-27.basil", // Usar a versão mais recente
  typescript: true,
});

// =====================================================
// CLASSE DE GERENCIAMENTO DE ASSINATURAS
// =====================================================
export class SubscriptionService {
  // Verificar se está em ambiente de desenvolvimento
  static isDevelopment(): boolean {
    return subscriptionConfig.isDevelopment;
  }

  // Verificar se o bypass de assinatura está habilitado
  static isSubscriptionBypassEnabled(): boolean {
    return subscriptionConfig.subscriptionBypass;
  }

  // Bypass para desenvolvimento ou teste - sempre permitir interações
  static subscriptionBypass(): boolean {
    if (this.isSubscriptionBypassEnabled()) {
      console.warn(
        "[BYPASS MODE] Bypassing subscription validation - SUBSCRIPTION_BYPASS=true"
      );
      return true;
    }
    return false;
  }

  // Método legacy para compatibilidade (deprecated)
  static developmentBypass(): boolean {
    console.warn("[DEPRECATED] Use subscriptionBypass() instead");
    return this.subscriptionBypass();
  }

  /**
   * Buscar customer por email
   */
  static async findCustomerByEmail(
    email: string
  ): Promise<Stripe.Customer | null> {
    try {
      console.log(`[Stripe] Buscando customer por email: ${email}`);

      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        const customer = customers.data[0];
        console.log(`[Stripe] Customer encontrado: ${customer.id}`);
        return customer;
      }

      console.log(`[Stripe] Nenhum customer encontrado para email: ${email}`);
      return null;
    } catch (error) {
      console.error("[Stripe] Erro ao buscar customer por email:", error);
      throw new Error("Falha ao buscar customer no Stripe");
    }
  }

  /**
   * Criar customer no Stripe (ou buscar existente por email)
   */
  static async createStripeCustomer(
    email: string,
    name: string
  ): Promise<Stripe.Customer> {
    try {
      console.log(
        `[Stripe] Verificando se customer já existe para email: ${email}`
      );

      // Primeiro, verificar se já existe um customer com esse email
      const existingCustomer = await this.findCustomerByEmail(email);

      if (existingCustomer) {
        console.log(
          `[Stripe] ✅ Customer já existe: ${existingCustomer.id} para ${email}`
        );

        // Atualizar o nome se necessário
        if (existingCustomer.name !== name) {
          console.log(
            `[Stripe] Atualizando nome do customer de "${existingCustomer.name}" para "${name}"`
          );
          const updatedCustomer = await stripe.customers.update(
            existingCustomer.id,
            {
              name: name,
            }
          );
          return updatedCustomer;
        }

        return existingCustomer;
      }

      // Se não existe, criar novo customer
      console.log(
        `[Stripe] Customer não existe, criando novo para email: ${email}`
      );
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: "nutrichat",
        },
      });

      console.log(
        `[Stripe] ✅ Novo customer criado: ${customer.id} para ${email}`
      );
      return customer;
    } catch (error) {
      console.error("[Stripe] Erro ao criar/buscar customer:", error);
      throw new Error("Falha ao criar customer no Stripe");
    }
  }

  /**
   * Criar session de checkout para assinatura
   */
  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        billing_address_collection: "required",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            source: "nutrichat",
          },
        },
        metadata: {
          source: "nutrichat",
        },
      });

      console.log(`[Stripe] Checkout session criada: ${session.id}`);
      return session;
    } catch (error) {
      console.error("[Stripe] Erro ao criar checkout session:", error);
      throw new Error("Falha ao criar session de checkout");
    }
  }

  /**
   * Buscar assinatura no Stripe
   */
  static async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    try {
      console.log(`[Stripe] Buscando subscription completa: ${subscriptionId}`);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // console.log(`[Stripe] Subscription obtida:`, {
      //   id: subscription.id,
      //   status: subscription.status,
      //   current_period_start: subscription.items.data[0]?.current_period_start,
      //   current_period_end: subscription.items.data[0]?.current_period_end,
      //   trial_start: subscription.trial_start,
      //   trial_end: subscription.trial_end,
      //   customer: subscription.customer,
      // });
      console.log(
        `[Stripe] Subscription completa: ${JSON.stringify(subscription)}`
      );
      return subscription;
    } catch (error) {
      console.error("[Stripe] Erro ao buscar assinatura:", error);
      throw new Error("Assinatura não encontrada");
    }
  }

  /**
   * Cancelar assinatura
   */
  static async cancelSubscription(
    subscriptionId: string,
    immediately = false
  ): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        // Cancelar imediatamente
        subscription = await stripe.subscriptions.cancel(subscriptionId);
      } else {
        // Cancelar no final do período atual
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      console.log(`[Stripe] Assinatura cancelada: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error("[Stripe] Erro ao cancelar assinatura:", error);
      throw new Error("Falha ao cancelar assinatura");
    }
  }

  /**
   * Reativar assinatura cancelada
   */
  static async reactivateSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      console.log(`[Stripe] Assinatura reativada: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error("[Stripe] Erro ao reativar assinatura:", error);
      throw new Error("Falha ao reativar assinatura");
    }
  }

  /**
   * Obter portal de billing para o customer
   */
  static async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      console.log(
        `[Stripe] Portal session criada para customer: ${customerId}`
      );
      return session;
    } catch (error) {
      console.error("[Stripe] Erro ao criar portal session:", error);
      throw new Error("Falha ao criar portal de billing");
    }
  }

  /**
   * Verificar e validar webhook do Stripe
   */
  static verifyWebhook(payload: string, signature: string): Stripe.Event {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        subscriptionConfig.stripeWebhookSecret
      );

      console.log(`[Stripe] Webhook verificado: ${event.type}`);
      return event;
    } catch (error) {
      console.error("[Stripe] Erro ao verificar webhook:", error);
      throw new Error("Webhook inválido");
    }
  }

  /**
   * Mapear status do Stripe para nosso tipo
   */
  static mapStripeStatus(stripeStatus: string): string {
    const statusMap: { [key: string]: string } = {
      active: "active",
      canceled: "canceled",
      incomplete: "incomplete",
      incomplete_expired: "incomplete_expired",
      past_due: "past_due",
      trialing: "trialing",
      unpaid: "unpaid",
      paused: "paused",
    };

    return statusMap[stripeStatus] || stripeStatus;
  }

  /**
   * Obter informações do plano pelo price_id (busca do banco)
   */
  static async getPlanByPriceId(priceId: string) {
    const { UserSubscriptionService } = await import("@/lib/subscription");
    const plans = await UserSubscriptionService.getAvailablePlans();
    // Procurar plano que tenha algum price com o stripe_price_id igual ao informado
    return (
      plans.find((plan) =>
        plan.prices?.some((price) => price.stripe_price_id === priceId)
      ) || null
    );
  }

  /**
   * Listar todos os planos disponíveis (busca planos do banco + preços da Stripe)
   */
  static async getAvailablePlans() {
    try {
      const { UserSubscriptionService } = await import("@/lib/subscription");
      const dbPlans = await UserSubscriptionService.getAvailablePlans();
      if (dbPlans.length === 0) {
        throw new Error("Nenhum plano encontrado no banco");
      }
      // Se em desenvolvimento e sem chave Stripe válida, usar preços do banco
      if (this.isDevelopment() && !stripeSecretKey) {
        console.warn(
          "[DEV MODE] Usando preços do banco (Stripe não configurado)"
        );
        // Retornar todos os preços atuais de cada plano
        return dbPlans.flatMap((plan) =>
          plan.prices
            .filter((price) => price.is_current)
            .map((price) => ({
              type: plan.slug,
              name: plan.name,
              dailyLimit: plan.daily_interactions_limit,
              priceId: price.stripe_price_id,
              productId: plan.stripe_product_id,
              priceCents: price.amount,
              currency: price.currency || "brl",
              features: plan.features || [],
              interval: price.interval,
            }))
        );
      }

      // Buscar preços reais da Stripe para cada preço atual de cada plano
      const plansWithStripeData = await Promise.all(
        dbPlans.flatMap((plan) =>
          plan.prices
            .filter((price) => price.is_current)
            .map(async (price) => {
              try {
                console.log(
                  `[Stripe] Buscando preço: ${price.stripe_price_id}`
                );
                const stripePrice = await stripe.prices.retrieve(
                  price.stripe_price_id
                );
                return {
                  type: plan.slug,
                  name: plan.name,
                  dailyLimit: plan.daily_interactions_limit,
                  priceId: price.stripe_price_id,
                  productId: plan.stripe_product_id,
                  priceCents: stripePrice.unit_amount || price.amount,
                  currency: stripePrice.currency || price.currency || "brl",
                  features: plan.features || [],
                  interval: price.interval,
                  stripeData: {
                    active: stripePrice.active,
                    recurring: stripePrice.recurring,
                    created: stripePrice.created,
                  },
                };
              } catch (error) {
                console.warn(
                  `[Stripe] Erro ao buscar preço ${price.stripe_price_id}, usando dados do banco:`,
                  error
                );
                // Fallback para dados do banco em caso de erro
                return {
                  type: plan.slug,
                  name: plan.name,
                  dailyLimit: plan.daily_interactions_limit,
                  priceId: price.stripe_price_id,
                  productId: plan.stripe_product_id,
                  priceCents: price.amount,
                  currency: price.currency || "brl",
                  features: plan.features || [],
                  interval: price.interval,
                };
              }
            })
        )
      );

      return plansWithStripeData;
    } catch (error) {
      console.error("Erro ao buscar planos:", error);

      // Fallback para dados mockados em desenvolvimento
      if (this.isDevelopment()) {
        console.warn(
          "[DEV MODE] Usando preços mockados como fallback completo"
        );
        return [
          {
            type: "basic",
            name: "Plano Básico",
            dailyLimit: 50,
            priceId: "price_basic_placeholder",
            productId: "prod_basic_placeholder",
            priceCents: 1999,
            currency: "brl",
            features: ["50 interações por dia", "Suporte via email"],
          },
          {
            type: "pro",
            name: "Plano Pro",
            dailyLimit: 150,
            priceId: "price_pro_placeholder",
            productId: "prod_pro_placeholder",
            priceCents: 4999,
            currency: "brl",
            features: [
              "150 interações por dia",
              "Suporte prioritário",
              "API access",
            ],
          },
        ];
      }

      return [];
    }
  }
}

export default SubscriptionService;
