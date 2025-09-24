import { supabase } from './supabase';
import { SubscriptionService } from './stripe';
import { 
  UserSubscription, 
  SubscriptionPlan, 
  UserInteractionStatus,
  DailyInteractionUsage,
  SubscriptionStatus
} from '@/types/subscription';

// =====================================================
// SERVIÇO DE GERENCIAMENTO DE ASSINATURAS
// =====================================================
export class UserSubscriptionService {
  
  /**
   * Verificar se Supabase está configurado
   */
  private static isSupabaseConfigured(): boolean {
    return supabase !== null;
  }
  
  /**
   * Mapear nome do plano para tipo compatível com sistema antigo
   */
  private static mapToPlanType(planName: string): 'free' | 'premium' | 'enterprise' | 'basic' | 'pro' {
    const name = planName?.toLowerCase() || '';
    if (name.includes('básico') || name.includes('basic')) return 'basic';
    if (name.includes('pro')) return 'pro';
    if (name.includes('premium')) return 'premium';
    if (name.includes('enterprise')) return 'enterprise';
    return 'free';
  }
  
  /**
   * Verificar se usuário pode interagir (com bypass opcional)
   */
  static async canUserInteract(userId: string): Promise<UserInteractionStatus> {
    // BYPASS PARA DESENVOLVIMENTO/TESTE
    if (SubscriptionService.subscriptionBypass()) {
      return {
        canInteract: true,
        remainingInteractions: 999,
        dailyLimit: 999,
        planName: 'BYPASS MODE',
        planType: 'premium', // Compatibilidade com sistema antigo
        subscriptionStatus: 'active' as SubscriptionStatus,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // amanhã
      };
    }
    
    if (!this.isSupabaseConfigured()) {
      throw new Error('Banco de dados não configurado');
    }
    
    try {
      // Usar função SQL que verifica tudo
      const { data, error } = await supabase!
        .rpc('can_user_interact_with_subscription', { user_id: userId });
      
      if (error) {
        console.error('Erro ao verificar interações:', error);
        throw new Error('Falha ao verificar limites de interação');
      }
      
      // Converter resposta da função SQL
      const result = data as any;
      
      return {
        canInteract: result.canInteract,
        remainingInteractions: result.remainingInteractions,
        dailyLimit: result.dailyLimit,
        planName: result.planName || 'Sem plano',
        planType: this.mapToPlanType(result.planName),
        subscriptionStatus: result.subscriptionStatus as SubscriptionStatus,
        currentPeriodEnd: new Date(result.currentPeriodEnd),
        resetTime: this.getNextResetTime(),
        isTrialing: result.isTrialing,
        trialEndsAt: result.trialEnd ? new Date(result.trialEnd) : undefined
      };
      
    } catch (error) {
      console.error('Erro ao verificar interações do usuário:', error);
      // Em caso de erro, negar acesso para segurança
      return {
        canInteract: false,
        remainingInteractions: 0,
        dailyLimit: 0,
        planName: 'Erro',
        planType: 'free',
        subscriptionStatus: 'unpaid' as SubscriptionStatus,
        currentPeriodEnd: new Date(),
        resetTime: this.getNextResetTime()
      };
    }
  }
  
  /**
   * Incrementar uso de interação diária
   */
  static async incrementInteractionUsage(userId: string): Promise<boolean> {
    // BYPASS PARA DESENVOLVIMENTO/TESTE
    if (SubscriptionService.subscriptionBypass()) {
      console.log('[BYPASS MODE] Bypassing interaction increment');
      return true;
    }
    
    if (!this.isSupabaseConfigured()) {
      throw new Error('Banco de dados não configurado');
    }
    
    try {
      const { data, error } = await supabase!
        .rpc('increment_daily_interaction_usage', { user_id: userId });
      
      if (error) {
        console.error('Erro ao incrementar uso:', error);
        return false;
      }
      
      return data as boolean;
      
    } catch (error) {
      console.error('Erro ao incrementar interação:', error);
      return false;
    }
  }
  
  /**
   * Obter assinatura ativa do usuário
   */
  static async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
    if (!this.isSupabaseConfigured()) {
      return null;
    }
    
    try {
      const { data, error } = await supabase!
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .gte('current_period_end', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao buscar assinatura:', error);
        return null;
      }
      
      return data as UserSubscription;
      
    } catch (error) {
      console.error('Erro ao obter assinatura ativa:', error);
      return null;
    }
  }
  
  /**
   * Criar nova assinatura no banco
   */
  static async createSubscription(
    userId: string,
    planId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    subscriptionData: any
  ): Promise<UserSubscription> {
    if (!this.isSupabaseConfigured()) {
      throw new Error('Banco de dados não configurado');
    }
    
    try {
      const subscriptionRecord = {
        user_id: userId,
        plan_id: planId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: SubscriptionService.mapStripeStatus(subscriptionData.status),
        current_period_start: new Date(subscriptionData.current_period_start * 1000),
        current_period_end: new Date(subscriptionData.current_period_end * 1000),
        trial_start: subscriptionData.trial_start ? new Date(subscriptionData.trial_start * 1000) : null,
        trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000) : null,
        metadata: subscriptionData.metadata || {}
      };
      
      const { data, error } = await supabase!
        .from('user_subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar assinatura no banco:', error);
        throw new Error('Falha ao salvar assinatura');
      }
      
      console.log(`[DB] Assinatura criada para usuário ${userId}`);
      return data as UserSubscription;
      
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }
  
  /**
   * Atualizar assinatura existente
   */
  static async updateSubscription(
    subscriptionId: string,
    subscriptionData: any
  ): Promise<UserSubscription> {
    if (!this.isSupabaseConfigured()) {
      throw new Error('Banco de dados não configurado');
    }
    
    try {
      const updates = {
        status: SubscriptionService.mapStripeStatus(subscriptionData.status),
        current_period_start: new Date(subscriptionData.current_period_start * 1000),
        current_period_end: new Date(subscriptionData.current_period_end * 1000),
        trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000) : null,
        canceled_at: subscriptionData.canceled_at ? new Date(subscriptionData.canceled_at * 1000) : null,
        cancel_at: subscriptionData.cancel_at ? new Date(subscriptionData.cancel_at * 1000) : null,
        metadata: subscriptionData.metadata || {},
        updated_at: new Date()
      };
      
      const { data, error } = await supabase!
        .from('user_subscriptions')
        .update(updates)
        .eq('stripe_subscription_id', subscriptionId)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar assinatura:', error);
        throw new Error('Falha ao atualizar assinatura');
      }
      
      console.log(`[DB] Assinatura atualizada: ${subscriptionId}`);
      return data as UserSubscription;
      
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      throw error;
    }
  }
  
  /**
   * Obter planos disponíveis
   */
  static async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    if (!this.isSupabaseConfigured()) {
      // Retornar planos padrão se DB não configurado
      return [
        {
          id: 'basic',
          name: 'Plano Básico',
          stripe_price_id: 'price_basic_placeholder',
          stripe_product_id: 'prod_basic_placeholder',
          daily_interactions_limit: 50,
          price_cents: 1999,
          interval: 'month',
          features: ['50 interações por dia', 'Suporte básico'],
          created_at: new Date(),
          updated_at: new Date()
        } as SubscriptionPlan,
        {
          id: 'pro',
          name: 'Plano Pro',
          stripe_price_id: 'price_pro_placeholder',
          stripe_product_id: 'prod_pro_placeholder',
          daily_interactions_limit: 150,
          price_cents: 4999,
          interval: 'month',
          features: ['150 interações por dia', 'Suporte prioritário', 'API access'],
          created_at: new Date(),
          updated_at: new Date()
        } as SubscriptionPlan
      ];
    }
    
    try {
      const { data, error } = await supabase!
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('price_cents', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar planos:', error);
        return [];
      }
      
      return data as SubscriptionPlan[];
      
    } catch (error) {
      console.error('Erro ao obter planos:', error);
      return [];
    }
  }
  
  /**
   * Obter uso diário atual
   */
  static async getDailyUsage(userId: string): Promise<DailyInteractionUsage | null> {
    if (!this.isSupabaseConfigured()) {
      return null;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await supabase!
        .from('daily_interaction_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar uso diário:', error);
        return null;
      }
      
      return data as DailyInteractionUsage;
      
    } catch (error) {
      console.error('Erro ao obter uso diário:', error);
      return null;
    }
  }
  
  /**
   * Obter próximo horário de reset (meia-noite)
   */
  private static getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  /**
   * Obter estatísticas do usuário
   */
  static async getUserStats(userId: string) {
    const subscription = await this.getUserActiveSubscription(userId);
    const usage = await this.getDailyUsage(userId);
    const status = await this.canUserInteract(userId);
    
    return {
      hasActiveSubscription: subscription !== null,
      subscription,
      dailyUsage: usage,
      interactionStatus: status
    };
  }
  
  /**
   * Cancelar assinatura do usuário
   */
  static async cancelUserSubscription(userId: string, immediately = false): Promise<boolean> {
    const subscription = await this.getUserActiveSubscription(userId);
    if (!subscription) {
      throw new Error('Usuário não possui assinatura ativa');
    }
    
    try {
      // Cancelar no Stripe
      await SubscriptionService.cancelSubscription(subscription.stripe_subscription_id, immediately);
      
      // A atualização no banco será feita via webhook
      return true;
    } catch (error) {
      console.error('Erro ao cancelar assinatura do usuário:', error);
      throw error;
    }
  }
}

export default UserSubscriptionService;