import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
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
  private static isSupabaseConfigured(client?: any): boolean {
    return !!client;
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
  static async canUserInteract(userId: string, client?: any): Promise<UserInteractionStatus> {
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
    client = client || supabase;
    if (!this.isSupabaseConfigured(client)) {
      throw new Error('Banco de dados não configurado');
    }
    
    try {
      // Usar função SQL que verifica tudo
      const { data, error } = await client!
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
  static async getUserActiveSubscription(userId: string, client?: any): Promise<UserSubscription | null> {
    client = client || supabase;
    if (!this.isSupabaseConfigured(client)) {
      return null;
    }
    
    try {
      const { data, error } = await client!
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
      // Extrair current_period_start e current_period_end do primeiro item da subscription
      const firstItem = subscriptionData.items?.data?.[0];
      const currentPeriodStart = firstItem?.current_period_start;
      const currentPeriodEnd = firstItem?.current_period_end;

      // Debug: log dos dados recebidos
      console.log('[DB] Dados da subscription recebidos:', {
        id: subscriptionData.id,
        status: subscriptionData.status,
        subscription_current_period_start: subscriptionData.current_period_start,
        subscription_current_period_end: subscriptionData.current_period_end,
        first_item_current_period_start: currentPeriodStart,
        first_item_current_period_end: currentPeriodEnd,
        trial_start: subscriptionData.trial_start,
        trial_end: subscriptionData.trial_end,
        items_count: subscriptionData.items?.data?.length || 0
      });

      // Validar dados obrigatórios
      if (!currentPeriodStart) {
        throw new Error('current_period_start não pode ser nulo (verificado no primeiro item da subscription)');
      }
      if (!currentPeriodEnd) {
        throw new Error('current_period_end não pode ser nulo (verificado no primeiro item da subscription)');
      }

      const subscriptionRecord = {
        user_id: userId,
        plan_id: planId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: SubscriptionService.mapStripeStatus(subscriptionData.status),
        current_period_start: new Date(currentPeriodStart * 1000),
        current_period_end: new Date(currentPeriodEnd * 1000),
        trial_start: subscriptionData.trial_start ? new Date(subscriptionData.trial_start * 1000) : null,
        trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000) : null,
        metadata: subscriptionData.metadata || {}
      };
      
      // Usar supabaseAdmin para bypasses RLS em operações do sistema (webhooks, etc)
      const client = supabaseAdmin || supabase;
      
      console.log('[DB] Executando INSERT na tabela user_subscriptions...');
      console.log('[DB] Dados do registro:', subscriptionRecord);
      
      // Primeiro, verificar se já existe uma subscription com esse stripe_subscription_id
      const { data: existingSubscription, error: checkError } = await client!
        .from('user_subscriptions')
        .select('id, status')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

      if (existingSubscription) {
        console.log('[DB] ⚠️ Subscription já existe no banco, atualizando ao invés de inserir');
        console.log('[DB] Subscription existente:', existingSubscription);
        
        // Atualizar subscription existente ao invés de inserir nova
        const { data: updatedData, error: updateError } = await client!
          .from('user_subscriptions')
          .update({
            status: subscriptionRecord.status,
            current_period_start: subscriptionRecord.current_period_start,
            current_period_end: subscriptionRecord.current_period_end,
            trial_start: subscriptionRecord.trial_start,
            trial_end: subscriptionRecord.trial_end,
            metadata: subscriptionRecord.metadata,
            updated_at: new Date()
          })
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .select()
          .single();

        if (updateError) {
          console.error('[DB] ❌ FALHA no UPDATE - Erro ao atualizar assinatura no banco:', updateError);
          throw new Error(`Falha ao atualizar assinatura existente: ${updateError.message}`);
        }

        console.log('[DB] ✅ UPDATE REALIZADO COM SUCESSO na tabela user_subscriptions');
        console.log('[DB] Dados atualizados:', updatedData);
        console.log(`[DB] Assinatura atualizada para usuário: ${userId} com subscription_id: ${stripeSubscriptionId}`);
        
        return updatedData as UserSubscription;
      }

      // Se não existe, fazer o INSERT normalmente
      const { data, error } = await client!
        .from('user_subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();
      
      console.log('[DB] Resultado do INSERT:', { data, error });
      
      if (error) {
        console.error('[DB] ❌ FALHA no INSERT - Erro ao criar assinatura no banco:', error);
        
        // Melhorar mensagem de erro baseada no código
        if (error.code === '23502') {
          throw new Error(`Campo obrigatório não informado: ${error.message}`);
        } else if (error.code === '23505') {
          throw new Error('Assinatura já existe para este usuário');
        } else if (error.code === '42501') {
          throw new Error('Permissão negada para criar assinatura');
        } else {
          throw new Error(`Falha ao salvar assinatura: ${error.message}`);
        }
      }
      
      console.log('[DB] ✅ INSERT REALIZADO COM SUCESSO na tabela user_subscriptions');
      console.log('[DB] Dados inseridos:', data);
      console.log(`[DB] ID da assinatura criada: ${data?.id}`);
      console.log(`[DB] Assinatura criada para usuário: ${userId} com subscription_id: ${stripeSubscriptionId}`);
      
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
      // Extrair current_period_start e current_period_end do primeiro item da subscription
      const firstItem = subscriptionData.items?.data?.[0];
      const currentPeriodStart = firstItem?.current_period_start;
      const currentPeriodEnd = firstItem?.current_period_end;

      const updates = {
        status: SubscriptionService.mapStripeStatus(subscriptionData.status),
        current_period_start: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000) : null,
        canceled_at: subscriptionData.canceled_at ? new Date(subscriptionData.canceled_at * 1000) : null,
        cancel_at: subscriptionData.cancel_at ? new Date(subscriptionData.cancel_at * 1000) : null,
        metadata: subscriptionData.metadata || {},
        updated_at: new Date()
      };
      
      // Usar supabaseAdmin para bypasses RLS em operações do sistema (webhooks, etc)
      const client = supabaseAdmin || supabase;
      
      const { data, error } = await client!
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
  static async getDailyUsage(userId: string, client?: any): Promise<DailyInteractionUsage | null> {
    client = client || supabase;
    if (!this.isSupabaseConfigured(client)) {
      return null;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await client!
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
  static async getUserStats(userId: string, client?: any) {
    const subscription = await this.getUserActiveSubscription(userId, client);
    const usage = await this.getDailyUsage(userId, client);
    const status = await this.canUserInteract(userId, client);
    
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