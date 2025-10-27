import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabase-admin";
import { SubscriptionService, stripe } from "./stripe";
import {
  UserSubscription,
  SubscriptionPlan,
  UserInteractionStatus,
  DailyInteractionUsage,
  SubscriptionStatus,
} from "@/types/subscription";
import Stripe from "stripe";

// =====================================================
// INTERFACES PARA DADOS DO STRIPE
// =====================================================

/**
 * Interface para resultado da função SQL de verificação de interações
 */
interface InteractionCheckResult {
  canInteract: boolean;
  remainingInteractions: number;
  dailyLimit: number;
  planName: string;
  planType: string;
  subscriptionStatus: string;
  currentPeriodEnd: string;
  resetTime: string;
  isTrialing?: boolean;
  trialEnd?: string;
}

// =====================================================
// SERVIÇO DE GERENCIAMENTO DE ASSINATURAS
// =====================================================
export class UserSubscriptionService {
  /**
   * Verificar se Supabase está configurado
   */
  private static isSupabaseConfigured(): boolean {
    return !!(supabaseAdmin || supabase);
  }

  /**
   * Mapear nome do plano para tipo compatível com sistema antigo
   */
  private static mapToPlanType(
    planName: string
  ): "free" | "premium" | "enterprise" | "basic" | "pro" {
    const name = planName?.toLowerCase() || "";
    if (name.includes("básico") || name.includes("basic")) return "basic";
    if (name.includes("pro")) return "pro";
    if (name.includes("premium")) return "premium";
    if (name.includes("enterprise")) return "enterprise";
    return "free";
  }

  /**
   * Verificar se usuário pode interagir (com bypass opcional)
   */
  static async canUserInteract(userId: string): Promise<UserInteractionStatus> {
    // BYPASS PARA DESENVOLVIMENTO/TESTE
    // if (SubscriptionService.subscriptionBypass()) {
    //   return {
    //     canInteract: true,
    //     remainingInteractions: 999,
    //     dailyLimit: 999,
    //     planName: 'BYPASS MODE',
    //     planType: 'premium', // Compatibilidade com sistema antigo
    //     subscriptionStatus: 'active' as SubscriptionStatus,
    //     currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    //     resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // amanhã
    //   };
    // }
    if (!this.isSupabaseConfigured()) {
      throw new Error("Banco de dados não configurado");
    }

    try {
      // Usar cliente público quando disponível, senão usar admin como fallback
      const client = supabase || supabaseAdmin;

      // Usar função SQL que verifica tudo
      const { data, error } = await client!.rpc(
        "can_user_interact_with_subscription",
        { user_id: userId }
      );

      if (error) {
        console.error("Erro ao verificar interações:", error);
        throw new Error("Falha ao verificar limites de interação");
      }

      // Converter resposta da função SQL
      const result = data as InteractionCheckResult;

      return {
        canInteract: result.canInteract,
        remainingInteractions: result.remainingInteractions,
        dailyLimit: result.dailyLimit,
        planName: result.planName || "Sem plano",
        planType: this.mapToPlanType(result.planName),
        subscriptionStatus: result.subscriptionStatus as SubscriptionStatus,
        currentPeriodEnd: new Date(result.currentPeriodEnd),
        resetTime: this.getNextResetTime(),
        isTrialing: result.isTrialing,
        trialEndsAt: result.trialEnd ? new Date(result.trialEnd) : undefined,
      };
    } catch (error) {
      console.error("Erro ao verificar interações do usuário:", error);
      // Em caso de erro, negar acesso para segurança
      return {
        canInteract: false,
        remainingInteractions: 0,
        dailyLimit: 0,
        planName: "Erro",
        planType: "free",
        subscriptionStatus: "unpaid" as SubscriptionStatus,
        currentPeriodEnd: new Date(),
        resetTime: this.getNextResetTime(),
      };
    }
  }

  /**
   * Incrementar uso de interação diária
   */
  static async incrementInteractionUsage(userId: string): Promise<boolean> {
    // BYPASS PARA DESENVOLVIMENTO/TESTE
    // if (SubscriptionService.subscriptionBypass()) {
    //   console.log('[BYPASS MODE] Bypassing interaction increment');
    //   return true;
    // }

    if (!this.isSupabaseConfigured()) {
      throw new Error("Banco de dados não configurado");
    }

    try {
      const client = supabase || supabaseAdmin;
      const { data, error } = await client!.rpc(
        "increment_daily_interaction_usage",
        { user_id: userId }
      );

      if (error) {
        console.error("Erro ao incrementar uso:", error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error("Erro ao incrementar interação:", error);
      return false;
    }
  }

  /**
   * Obter assinatura ativa do usuário
   */
  static async getUserActiveSubscription(
    userId: string
  ): Promise<UserSubscription | null> {
    // Usar sempre o supabaseAdmin para ignorar RLS e garantir acesso
    if (!supabaseAdmin) {
      console.error(
        "[DB] supabaseAdmin não configurado, retornando null para assinatura ativa"
      );
      return null;
    }

    console.log(
      `[DB] Buscando assinatura ativa para usuário ${userId} (usando supabaseAdmin)`
    );

    try {
      const client = supabaseAdmin;
      const { data, error } = await client
        .from("user_subscriptions")
        .select(
          `
          *,
          plan:subscription_plans(*)
        `
        )
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .gte("current_period_end", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log(`[DB] Query para buscar assinatura:`, {
        userId,
        status: ["active", "trialing"],
        currentDate: new Date().toISOString(),
      });
      console.log(`[DB] Resultado da query:`, { data, error });
      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found
        console.error("Erro ao buscar assinatura:", error);
        console.error("Detalhes do erro:", {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return null;
      }
      console.log(`[DB] Assinatura ativa para usuário ${userId}:`, data);
      return data as UserSubscription;
    } catch (error) {
      console.error("Erro ao obter assinatura ativa:", error);
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
    subscriptionData: Stripe.Subscription
  ): Promise<UserSubscription> {
    if (!this.isSupabaseConfigured()) {
      throw new Error("Banco de dados não configurado");
    }

    try {
      // Extrair current_period_start e current_period_end do primeiro item da subscription
      const firstItem = subscriptionData.items?.data?.[0];
      const currentPeriodStart = firstItem?.current_period_start;
      const currentPeriodEnd = firstItem?.current_period_end;

      // Validar dados obrigatórios
      if (!currentPeriodStart) {
        throw new Error(
          "current_period_start não pode ser nulo (verificado no primeiro item da subscription)"
        );
      }
      if (!currentPeriodEnd) {
        throw new Error(
          "current_period_end não pode ser nulo (verificado no primeiro item da subscription)"
        );
      }

      const subscriptionRecord = {
        user_id: userId,
        plan_id: planId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: SubscriptionService.mapStripeStatus(subscriptionData.status),
        current_period_start: new Date(currentPeriodStart * 1000),
        current_period_end: new Date(currentPeriodEnd * 1000),
        trial_start: subscriptionData.trial_start
          ? new Date(subscriptionData.trial_start * 1000)
          : null,
        trial_end: subscriptionData.trial_end
          ? new Date(subscriptionData.trial_end * 1000)
          : null,
        metadata: subscriptionData.metadata || {},
      };

      // Usar supabaseAdmin para bypasses RLS em operações do sistema (webhooks, etc)
      const client = supabaseAdmin || supabase;

      console.log(
        "[DB][CREATE_SUBSCRIPTION] Executando verificação de existência de assinatura..."
      );
      // Primeiro, verificar se já existe uma subscription com esse stripe_subscription_id
      const { data: existingSubscription } = await client!
        .from("user_subscriptions")
        .select("id, status")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .not("status", "eq", "canceled")
        .single();

      if (existingSubscription) {
        console.log(
          "[DB][CREATE_SUBSCRIPTION] ⚠️ Subscription já existe no banco, atualizando ao invés de inserir"
        );
        console.log(
          "[DB][CREATE_SUBSCRIPTION] Subscription existente:",
          existingSubscription
        );
        console.log(
          "[DB][CREATE_SUBSCRIPTION] status:",
          subscriptionRecord.status
        );
        // Atualizar subscription existente ao invés de inserir nova
        const { data: updatedData, error: updateError } = await client!
          .from("user_subscriptions")
          .update({
            status: subscriptionRecord.status,
            current_period_start: subscriptionRecord.current_period_start,
            current_period_end: subscriptionRecord.current_period_end,
            trial_start: subscriptionRecord.trial_start,
            trial_end: subscriptionRecord.trial_end,
            metadata: subscriptionRecord.metadata,
            updated_at: new Date(),
          })
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .select()
          .single();

        if (updateError) {
          console.error(
            "[DB][CREATE_SUBSCRIPTION] ❌ FALHA no UPDATE - Erro ao atualizar assinatura no banco:",
            updateError
          );
          throw new Error(
            `[DB][CREATE_SUBSCRIPTION] Falha ao atualizar assinatura existente: ${updateError.message}`
          );
        }

        console.log(
          "[DB][CREATE_SUBSCRIPTION] ✅ UPDATE REALIZADO COM SUCESSO na tabela user_subscriptions"
        );
        console.log(
          "[DB][CREATE_SUBSCRIPTION] Dados atualizados:",
          updatedData
        );
        console.log(
          `[DB][CREATE_SUBSCRIPTION] Assinatura atualizada para usuário: ${userId} com subscription_id: ${stripeSubscriptionId}`
        );

        return updatedData as UserSubscription;
      }

      // Se não existe, fazer o INSERT normalmente
      console.log(
        "[DB][CREATE_SUBSCRIPTION] Não existe assinatura ativa, realizando INSERT..."
      );
      const { data, error } = await client!
        .from("user_subscriptions")
        .insert(subscriptionRecord)
        .select()
        .single();

      console.log("[DB][CREATE_SUBSCRIPTION] Resultado do INSERT:", {
        data,
        error,
      });

      if (error) {
        console.error(
          "[DB][CREATE_SUBSCRIPTION] ❌ FALHA no INSERT - Erro ao criar assinatura no banco:",
          error
        );

        // Melhorar mensagem de erro baseada no código
        if (error.code === "23502") {
          throw new Error(
            `[DB][CREATE_SUBSCRIPTION] Campo obrigatório não informado: ${error.message}`
          );
        } else if (error.code === "23505") {
          throw new Error(
            "[DB][CREATE_SUBSCRIPTION] Assinatura já existe para este usuário"
          );
        } else if (error.code === "42501") {
          throw new Error(
            "[DB][CREATE_SUBSCRIPTION] Permissão negada para criar assinatura"
          );
        } else {
          throw new Error(
            `[DB][CREATE_SUBSCRIPTION] Falha ao salvar assinatura: ${error.message}`
          );
        }
      }

      console.log(
        "[DB][CREATE_SUBSCRIPTION] ✅ INSERT REALIZADO COM SUCESSO na tabela user_subscriptions"
      );
      console.log("[DB][CREATE_SUBSCRIPTION] Dados inseridos:", data);
      console.log(
        `[DB][CREATE_SUBSCRIPTION] ID da assinatura criada: ${data?.id}`
      );
      console.log(
        `[DB][CREATE_SUBSCRIPTION] Assinatura criada para usuário: ${userId} com subscription_id: ${stripeSubscriptionId}`
      );

      return data as UserSubscription;
    } catch (error) {
      console.error(
        "[DB][CREATE_SUBSCRIPTION] Erro ao criar assinatura:",
        error
      );
      throw error;
    }
  }

  /**
   * Atualizar assinatura existente
   */
  static async updateSubscription(
    subscriptionId: string,
    subscriptionData: Stripe.Subscription
  ): Promise<UserSubscription> {
    if (!this.isSupabaseConfigured()) {
      throw new Error("Banco de dados não configurado");
    }

    try {
      // Extrair current_period_start e current_period_end do primeiro item da subscription
      const firstItem = subscriptionData.items?.data?.[0];
      const currentPeriodStart = firstItem?.current_period_start;
      const currentPeriodEnd = firstItem?.current_period_end;

      const updates = {
        status: SubscriptionService.mapStripeStatus(subscriptionData.status),
        current_period_start: currentPeriodStart
          ? new Date(currentPeriodStart * 1000)
          : null,
        current_period_end: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : null,
        trial_end: subscriptionData.trial_end
          ? new Date(subscriptionData.trial_end * 1000)
          : null,
        canceled_at: subscriptionData.canceled_at
          ? new Date(subscriptionData.canceled_at * 1000)
          : null,
        cancel_at: subscriptionData.cancel_at
          ? new Date(subscriptionData.cancel_at * 1000)
          : null,
        metadata: subscriptionData.metadata || {},
        updated_at: new Date(),
      };

      // Usar supabaseAdmin para bypasses RLS em operações do sistema (webhooks, etc)
      const client = supabaseAdmin || supabase;

      const { data, error } = await client!
        .from("user_subscriptions")
        .update(updates)
        .eq("stripe_subscription_id", subscriptionId)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar assinatura:", error);
        throw new Error("Falha ao atualizar assinatura");
      }

      console.log(`[DB] Assinatura atualizada: ${subscriptionId}`);
      return data as UserSubscription;
    } catch (error) {
      console.error("Erro ao atualizar assinatura:", error);
      throw error;
    }
  }

  /**
   * Obter planos disponíveis
   */
  static async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    if (!this.isSupabaseConfigured()) {
      console.warn(
        "Supabase não configurado - retornando lista vazia de planos"
      );
      return [];
    }

    try {
      const client = supabase || supabaseAdmin;
      // Buscar planos ativos e seus preços usando o join correto do remote schema
      const { data, error } = await client!
        .from("subscription_plan_prices")
        .select("*, prices:subscription_plan_prices(*)")
        .eq("active", true);

      if (error) {
        console.error("Erro ao buscar planos:", error);
        return [];
      }
      return data as SubscriptionPlan[];
    } catch (error) {
      console.error("Erro ao obter planos:", error);
      return [];
    }
  }

  /**
   * Obter uso diário atual
   */
  static async getDailyUsage(
    userId: string
  ): Promise<DailyInteractionUsage | null> {
    if (!this.isSupabaseConfigured()) {
      return null;
    }

    try {
      const client = supabase || supabaseAdmin;
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await client!
        .from("daily_interaction_usage")
        .select("*")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar uso diário:", error);
        return null;
      }

      return data as DailyInteractionUsage;
    } catch (error) {
      console.error("Erro ao obter uso diário:", error);
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
   * Verifica o status da assinatura no Stripe
   * Método para resolver inconsistências entre banco e Stripe
   */
  static async verifySubscriptionWithStripe(
    userId: string,
    stripeCustomerId: string
  ): Promise<UserSubscription | null> {
    console.log(
      `[Service] Verificando assinatura no Stripe para usuário ${userId}, customer ${stripeCustomerId}`
    );

    try {
      if (!stripeCustomerId) {
        console.warn(
          `[Service] Customer ID não fornecido para verificação no Stripe`
        );
        return null;
      }

      // Importar SubscriptionService do stripe.ts
      const { SubscriptionService } = await import("@/lib/stripe");

      // Buscar todas as assinaturas ativas do cliente no Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        console.log(
          `[Service] Nenhuma assinatura ativa encontrada no Stripe para customer ${stripeCustomerId}`
        );

        // Tentar também assinaturas em trial
        const trialSubscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "trialing",
          limit: 1,
        });

        if (trialSubscriptions.data.length === 0) {
          console.log(
            `[Service] Nenhuma assinatura em trial encontrada no Stripe para customer ${stripeCustomerId}`
          );
          return null;
        }

        // Usar a assinatura em trial encontrada
        const stripeSubscription = trialSubscriptions.data[0];
        console.log(
          `[Service] Assinatura em trial encontrada no Stripe: ${stripeSubscription.id}`
        );

        // Identificar o plano da assinatura
        const priceId = stripeSubscription.items.data[0]?.price.id;
        if (!priceId) {
          console.error(`[Service] Assinatura no Stripe não tem price ID`);
          return null;
        }

        // Obter detalhes do plano
        const plan = await SubscriptionService.getPlanByPriceId(priceId);
        if (!plan) {
          console.error(
            `[Service] Não foi possível encontrar o plano para o price ${priceId}`
          );
          return null;
        }

        // Sincronizar com o banco
        return await this.createSubscription(
          userId,
          plan.id,
          stripeCustomerId,
          stripeSubscription.id,
          stripeSubscription
        );
      }

      // Encontrou assinatura ativa no Stripe
      const stripeSubscription = subscriptions.data[0];
      console.log(
        `[Service] Assinatura ativa encontrada no Stripe: ${stripeSubscription.id}`
      );

      // Identificar o plano da assinatura
      const priceId = stripeSubscription.items.data[0]?.price.id;
      if (!priceId) {
        console.error(`[Service] Assinatura no Stripe não tem price ID`);
        return null;
      }

      // Obter detalhes do plano
      const plan = await SubscriptionService.getPlanByPriceId(priceId);
      if (!plan) {
        console.error(
          `[Service] Não foi possível encontrar o plano para o price ${priceId}`
        );
        return null;
      }

      // Sincronizar com o banco
      return await this.createSubscription(
        userId,
        plan.id,
        stripeCustomerId,
        stripeSubscription.id,
        stripeSubscription
      );
    } catch (error) {
      console.error("[Service] Erro ao verificar assinatura no Stripe:", error);
      return null;
    }
  }

  /**
   * Obter estatísticas do usuário
   */
  static async getUserStats(userId: string) {
    if (!this.isSupabaseConfigured()) {
      throw new Error("Banco de dados não configurado");
    }
    let subscription = await this.getUserActiveSubscription(userId);
    console.log(`[Service] Assinatura ativa obtida do banco:`, subscription);
    // Se não encontrou assinatura no banco, mas temos status de interação com plano ativo,
    // possivelmente há uma inconsistência entre banco e Stripe
    const status = await this.canUserInteract(userId);

    const usage = await this.getDailyUsage(userId);

    let hasActiveSubscription =
      subscription !== null ||
      status.subscriptionStatus === "active" ||
      status.subscriptionStatus === "trialing";

    // Verificar inconsistência: se não tem assinatura no banco, mas o status mostra plano ativo
    if (!subscription && hasActiveSubscription) {
      console.warn(
        `[Service] INCONSISTÊNCIA DETECTADA: Usuário ${userId} tem status ativo mas assinatura não encontrada no banco`
      );
      try {
        const client = supabaseAdmin || supabase;
        if (!client) {
          throw new Error(
            "Cliente Supabase não disponível para resolver inconsistência"
          );
        }
        // Buscar customer ID associado a este usuário para verificar no Stripe (usando auth.users)
        const { data: userData, error: userError } = await client
          .from("auth.users")
          .select("stripe_customer_id")
          .eq("id", userId)
          .single();

        if (userError) {
          console.error(
            `[Service] Erro ao buscar customer ID do usuário em auth.users:`,
            userError
          );
        } else if (userData?.stripe_customer_id) {
          // Tentar resolver inconsistência verificando diretamente no Stripe
          console.log(
            `[Service] Tentando resolver inconsistência verificando no Stripe para customer ${userData.stripe_customer_id}`
          );

          // Verificar e sincronizar com o Stripe
          const stripeSubscription = await this.verifySubscriptionWithStripe(
            userId,
            userData.stripe_customer_id
          );

          if (stripeSubscription) {
            console.log(
              `[Service] ✅ Assinatura recuperada do Stripe e sincronizada com o banco: ${stripeSubscription.id}`
            );
            subscription = stripeSubscription;
            hasActiveSubscription = true;
          } else {
            console.warn(
              `[Service] Assinatura não encontrada no Stripe, possível problema na flag de status ativo`
            );
          }
        } else {
          console.warn(
            `[Service] Usuário ${userId} não possui customer ID associado em auth.users`
          );
        }
      } catch (error) {
        console.error(
          `[Service] Erro ao resolver inconsistência de assinatura:`,
          error
        );
      }
    }

    console.log(`[Service] Estatísticas obtidas para usuário ${userId}:`, {
      subscription,
      usage,
      status,
    });
    return {
      hasActiveSubscription,
      subscription,
      dailyUsage: usage,
      interactionStatus: status,
    };
  }

  /**
   * Cancelar assinatura do usuário
   */
  static async cancelUserSubscription(
    userId: string,
    immediately = false
  ): Promise<boolean> {
    console.log(
      `[Service] Iniciando cancelamento de assinatura para usuário: ${userId}, imediatamente: ${immediately}`
    );
    const subscription = await this.getUserActiveSubscription(userId);
    console.log(`[Service] Assinatura atual do usuário:`, subscription);
    if (!subscription) {
      throw new Error("Usuário não possui assinatura ativa");
    }

    try {
      // Cancelar no Stripe
      await SubscriptionService.cancelSubscription(
        subscription.stripe_subscription_id,
        immediately
      );

      // A atualização no banco será feita via webhook
      return true;
    } catch (error) {
      console.error("Erro ao cancelar assinatura do usuário:", error);
      throw error;
    }
  }
}

export default UserSubscriptionService;
