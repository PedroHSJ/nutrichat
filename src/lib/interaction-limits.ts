import { supabase } from "./supabase";

export interface UserInteractionStatus {
  canInteract: boolean;
  remainingInteractions: number;
  dailyLimit: number;
  planType: "free" | "premium" | "enterprise";
  resetTime: Date;
}

export interface PlanLimits {
  free: number;
  premium: number;
  enterprise: number;
}

export class InteractionLimitService {
  // Limites por tipo de plano (configurável)
  private static readonly PLAN_LIMITS: PlanLimits = {
    free: 100,
    premium: 1000,
    enterprise: -1, // ilimitado
  };

  // Verificar se Supabase está configurado
  private static isSupabaseConfigured(): boolean {
    return supabase !== null;
  }

  // Verificar se o usuário pode fazer uma interação
  static async canUserInteract(userId: string): Promise<UserInteractionStatus> {
    if (!this.isSupabaseConfigured()) {
      // Se Supabase não estiver configurado, permitir interações ilimitadas
      return {
        canInteract: true,
        remainingInteractions: -1,
        dailyLimit: -1,
        planType: "free",
        resetTime: new Date(),
      };
    }

    try {
      // Usar função do banco para verificar se pode interagir
      const { data: canInteract, error: canInteractError } =
        await supabase!.rpc("can_user_interact", { user_id: userId });

      if (canInteractError) {
        console.error(
          "Erro ao verificar se usuário pode interagir:",
          canInteractError,
        );
        // Em caso de erro, permitir a interação
        return {
          canInteract: true,
          remainingInteractions: -1,
          dailyLimit: -1,
          planType: "free",
          resetTime: new Date(),
        };
      }

      // Buscar detalhes do usuário
      const { data: userProfile, error: profileError } = await supabase!
        .from("user_profiles")
        .select(
          "daily_interactions_count, daily_interactions_limit, plan_type, daily_interactions_reset_date",
        )
        .eq("id", userId)
        .single();

      if (profileError || !userProfile) {
        console.error("Erro ao buscar perfil do usuário:", profileError);
        return {
          canInteract: true,
          remainingInteractions: -1,
          dailyLimit: -1,
          planType: "free",
          resetTime: new Date(),
        };
      }

      const remainingInteractions = Math.max(
        0,
        userProfile.daily_interactions_limit -
          userProfile.daily_interactions_count,
      );
      const resetTime = new Date(userProfile.daily_interactions_reset_date);
      resetTime.setDate(resetTime.getDate() + 1); // Reset no próximo dia

      return {
        canInteract: canInteract as boolean,
        remainingInteractions,
        dailyLimit: userProfile.daily_interactions_limit,
        planType: userProfile.plan_type as "free" | "premium" | "enterprise",
        resetTime,
      };
    } catch (error) {
      console.error("Erro ao verificar limitação de interações:", error);
      // Em caso de erro, permitir a interação
      return {
        canInteract: true,
        remainingInteractions: -1,
        dailyLimit: -1,
        planType: "free",
        resetTime: new Date(),
      };
    }
  }

  // Incrementar contador de interações
  static async incrementUserInteractions(userId: string): Promise<boolean> {
    if (!this.isSupabaseConfigured()) {
      // Se Supabase não estiver configurado, sempre retornar true
      return true;
    }

    try {
      const { data: success, error } = await supabase!.rpc(
        "increment_user_interactions",
        { user_id: userId },
      );

      if (error) {
        console.error("Erro ao incrementar interações do usuário:", error);
        return false;
      }

      return success as boolean;
    } catch (error) {
      console.error("Erro ao incrementar interações:", error);
      return false;
    }
  }

  // Atualizar plano do usuário
  static async updateUserPlan(
    userId: string,
    planType: keyof PlanLimits,
  ): Promise<boolean> {
    if (!this.isSupabaseConfigured()) {
      console.warn("Supabase não configurado - não é possível atualizar plano");
      return false;
    }

    const newLimit = this.PLAN_LIMITS[planType];

    try {
      const { data: success, error } = await supabase!.rpc("update_user_plan", {
        user_id: userId,
        new_plan_type: planType,
        new_limit: newLimit,
      });

      if (error) {
        console.error("Erro ao atualizar plano do usuário:", error);
        return false;
      }

      return success as boolean;
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      return false;
    }
  }

  // Obter limites de planos (para exibição na UI)
  static getPlanLimits(): PlanLimits {
    return { ...this.PLAN_LIMITS };
  }

  // Resetar interações diárias manualmente (admin)
  static async resetDailyInteractions(): Promise<boolean> {
    if (!this.isSupabaseConfigured()) {
      return false;
    }

    try {
      const { error } = await supabase!.rpc("reset_daily_interactions");

      if (error) {
        console.error("Erro ao resetar interações diárias:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao resetar interações:", error);
      return false;
    }
  }

  // Obter estatísticas de uso para o usuário
  static async getUserUsageStats(userId: string): Promise<{
    totalInteractions: number;
    dailyInteractions: number;
    dailyLimit: number;
    planType: string;
  } | null> {
    if (!this.isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: userProfile, error } = await supabase!
        .from("user_profiles")
        .select(
          "daily_interactions_count, daily_interactions_limit, plan_type, login_count",
        )
        .eq("id", userId)
        .single();

      if (error || !userProfile) {
        console.error("Erro ao buscar estatísticas do usuário:", error);
        return null;
      }

      return {
        totalInteractions: userProfile.login_count || 0,
        dailyInteractions: userProfile.daily_interactions_count,
        dailyLimit: userProfile.daily_interactions_limit,
        planType: userProfile.plan_type,
      };
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return null;
    }
  }
}

export default InteractionLimitService;
