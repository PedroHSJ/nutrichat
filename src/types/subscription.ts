// Tipos para sistema de assinaturas e planos
export interface SubscriptionPlan {
  id: string;
  name: string;
  stripe_price_id: string;
  stripe_product_id: string;
  daily_interactions_limit: number;
  price_cents: number; // preço em centavos
  interval: 'month' | 'year';
  features: string[];
  created_at: Date;
  updated_at: Date;
}

// Status da assinatura baseado nos status do Stripe
export type SubscriptionStatus = 
  | 'active'          // Assinatura ativa
  | 'canceled'        // Cancelada pelo usuário
  | 'incomplete'      // Pagamento inicial falhou
  | 'incomplete_expired' // Pagamento expirou
  | 'past_due'        // Pagamento em atraso
  | 'trialing'        // Em período de teste
  | 'unpaid'          // Não paga
  | 'paused';         // Pausada

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date;
  trial_end?: Date;
  canceled_at?: Date;
  cancel_at?: Date; // Agendado para cancelar
  created_at: Date;
  updated_at: Date;
  
  // Relacionamentos
  plan?: SubscriptionPlan;
}

export interface DailyInteractionUsage {
  id: string;
  user_id: string;
  subscription_id: string;
  date: Date; // Data específica (YYYY-MM-DD)
  interactions_used: number;
  daily_limit: number;
  created_at: Date;
  updated_at: Date;
}

// Status das interações do usuário
export interface UserInteractionStatus {
  canInteract: boolean;
  remainingInteractions: number;
  dailyLimit: number;
  planName: string;
  planType?: 'free' | 'premium' | 'enterprise' | 'basic' | 'pro'; // Compatibilidade com sistema antigo
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date;
  resetTime: Date;
  isTrialing?: boolean;
  trialEndsAt?: Date;
}

// Dados para criar checkout session do Stripe
export interface CreateCheckoutRequest {
  price_id: string;
  success_url: string;
  cancel_url: string;
  customer_email?: string;
}

// Response do webhook do Stripe
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// Tipo para planos retornados pela API
export interface AvailablePlan {
  type: string;
  name: string;
  dailyLimit: number;
  priceId: string;
  productId: string;
  priceCents: number;
  currency?: string;
}

// Planos disponíveis (constantes)
export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PRO: 'pro'
} as const;

export type PlanType = typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];

// Configuração de ambiente
export interface SubscriptionConfig {
  isDevelopment: boolean;
  subscriptionBypass: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  plans: {
    [key in PlanType]: {
      name: string;
      dailyLimit: number;
      priceId: string;
      productId: string;
      priceCents: number;
    }
  };
}