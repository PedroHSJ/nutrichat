import Stripe from 'stripe';
import { SubscriptionConfig, SUBSCRIPTION_PLANS } from '@/types/subscription';

// =====================================================
// CONFIGURAÇÃO DO STRIPE
// =====================================================
export const subscriptionConfig: SubscriptionConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  subscriptionBypass: process.env.SUBSCRIPTION_BYPASS === 'true',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  plans: {
    [SUBSCRIPTION_PLANS.BASIC]: {
      name: 'Plano Básico',
      dailyLimit: 50,
      priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic_placeholder',
      productId: process.env.STRIPE_BASIC_PRODUCT_ID || 'prod_basic_placeholder',
      priceCents: 1999 // R$ 19,99
    },
    [SUBSCRIPTION_PLANS.PRO]: {
      name: 'Plano Pro',
      dailyLimit: 150,
      priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
      productId: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_pro_placeholder',
      priceCents: 4999 // R$ 49,99
    }
  }
};

// =====================================================
// INSTÂNCIA DO STRIPE
// =====================================================
const stripeSecretKey = subscriptionConfig.stripeSecretKey;

// Validação para desenvolvimento
if (!stripeSecretKey && process.env.NODE_ENV !== 'development') {
  throw new Error('STRIPE_SECRET_KEY is required');
}

// Em desenvolvimento, usar uma chave placeholder se não estiver configurada
const finalStripeKey = stripeSecretKey || 'sk_test_placeholder_for_development_only';

export const stripe = new Stripe(finalStripeKey, {
  apiVersion: '2025-08-27.basil', // Usar a versão mais recente
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
      console.warn('[BYPASS MODE] Bypassing subscription validation - SUBSCRIPTION_BYPASS=true');
      return true;
    }
    return false;
  }
  
  // Método legacy para compatibilidade (deprecated)
  static developmentBypass(): boolean {
    console.warn('[DEPRECATED] Use subscriptionBypass() instead');
    return this.subscriptionBypass();
  }
  
  /**
   * Criar customer no Stripe
   */
  static async createStripeCustomer(email: string, name: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'nutrichat'
        }
      });
      
      console.log(`[Stripe] Customer criado: ${customer.id} para ${email}`);
      return customer;
    } catch (error) {
      console.error('[Stripe] Erro ao criar customer:', error);
      throw new Error('Falha ao criar customer no Stripe');
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
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            source: 'nutrichat'
          }
        },
        metadata: {
          source: 'nutrichat'
        }
      });
      
      console.log(`[Stripe] Checkout session criada: ${session.id}`);
      return session;
    } catch (error) {
      console.error('[Stripe] Erro ao criar checkout session:', error);
      throw new Error('Falha ao criar session de checkout');
    }
  }
  
  /**
   * Buscar assinatura no Stripe
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('[Stripe] Erro ao buscar assinatura:', error);
      throw new Error('Assinatura não encontrada');
    }
  }
  
  /**
   * Cancelar assinatura
   */
  static async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;
      
      if (immediately) {
        // Cancelar imediatamente
        subscription = await stripe.subscriptions.cancel(subscriptionId);
      } else {
        // Cancelar no final do período atual
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
      }
      
      console.log(`[Stripe] Assinatura cancelada: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error('[Stripe] Erro ao cancelar assinatura:', error);
      throw new Error('Falha ao cancelar assinatura');
    }
  }
  
  /**
   * Reativar assinatura cancelada
   */
  static async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });
      
      console.log(`[Stripe] Assinatura reativada: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error('[Stripe] Erro ao reativar assinatura:', error);
      throw new Error('Falha ao reativar assinatura');
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
      
      console.log(`[Stripe] Portal session criada para customer: ${customerId}`);
      return session;
    } catch (error) {
      console.error('[Stripe] Erro ao criar portal session:', error);
      throw new Error('Falha ao criar portal de billing');
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
      console.error('[Stripe] Erro ao verificar webhook:', error);
      throw new Error('Webhook inválido');
    }
  }
  
  /**
   * Mapear status do Stripe para nosso tipo
   */
  static mapStripeStatus(stripeStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'active',
      'canceled': 'canceled',
      'incomplete': 'incomplete',
      'incomplete_expired': 'incomplete_expired',
      'past_due': 'past_due',
      'trialing': 'trialing',
      'unpaid': 'unpaid',
      'paused': 'paused'
    };
    
    return statusMap[stripeStatus] || stripeStatus;
  }
  
  /**
   * Obter informações do plano pelo price_id
   */
  static getPlanByPriceId(priceId: string) {
    for (const [planType, planConfig] of Object.entries(subscriptionConfig.plans)) {
      if (planConfig.priceId === priceId) {
        return {
          type: planType,
          ...planConfig
        };
      }
    }
    return null;
  }
  
  /**
   * Listar todos os planos disponíveis com preços do Stripe
   */
  static async getAvailablePlans() {
    try {
      // Se em desenvolvimento e sem chave válida, retornar dados mockados
      if (this.isDevelopment() && !stripeSecretKey) {
        console.warn('[DEV MODE] Usando preços mockados');
        return Object.entries(subscriptionConfig.plans).map(([type, config]) => ({
          type,
          ...config
        }));
      }

      // Buscar preços reais do Stripe
      const plans = [];
      
      for (const [type, config] of Object.entries(subscriptionConfig.plans)) {
        try {
          const price = await stripe.prices.retrieve(config.priceId);
          plans.push({
            type,
            name: config.name,
            dailyLimit: config.dailyLimit,
            priceId: config.priceId,
            productId: config.productId,
            priceCents: price.unit_amount || config.priceCents, // Fallback para valor configurado
            currency: price.currency || 'brl'
          });
        } catch (error) {
          console.warn(`[Stripe] Erro ao buscar preço ${config.priceId}, usando fallback:`, error);
          plans.push({
            type,
            ...config,
            currency: 'brl'
          });
        }
      }
      
      return plans;
    } catch (error) {
      console.error('[Stripe] Erro ao buscar planos:', error);
      // Fallback para configuração local
      return Object.entries(subscriptionConfig.plans).map(([type, config]) => ({
        type,
        ...config,
        currency: 'brl'
      }));
    }
  }
}

export default SubscriptionService;