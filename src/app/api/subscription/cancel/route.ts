import { NextRequest, NextResponse } from "next/server";
import { UserSubscriptionService } from "@/lib/subscription";
import { SubscriptionService } from "@/lib/stripe";
import { getSupabaseBearerClient, getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * POST /api/subscription/cancel
 * Cancela a assinatura do usuário
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
    
        if (!token) {
          return NextResponse.json(
            { success: false, error: "Token de acesso não fornecido" },
            { status: 401 },
          );
        }
    
        const supabase = getSupabaseBearerClient(token);

        const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 },
      );
    }

    // Cancelar assinatura
    const success = await UserSubscriptionService.cancelUserSubscription(
      user.id,
      true, // cancelar imediatamente
    );

    if (success) {
      // Atualizar o banco de dados imediatamente, sem depender apenas do webhook
      const subscription = await UserSubscriptionService.getUserActiveSubscription(user.id);
      if (subscription) {
        // Buscar dados atualizados da subscription no Stripe
        const stripeSubscription = await SubscriptionService.getSubscription(
          subscription.stripe_subscription_id
        );
        
        // Atualizar no banco com os dados do Stripe
        await UserSubscriptionService.updateSubscription(
          subscription.stripe_subscription_id,
          stripeSubscription
        );
        
        console.log("[API] Assinatura marcada como cancelada no banco de dados");
      }

      return NextResponse.json({
        success: true,
        message: "Assinatura cancelada com sucesso",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao cancelar assinatura",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[API] Erro ao cancelar assinatura:", error);

    // Tratamento de erros específicos
    if (error instanceof Error) {
      if (error.message.includes("não possui assinatura ativa")) {
        return NextResponse.json(
          {
            success: false,
            error: "Você não possui uma assinatura ativa para cancelar",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao cancelar assinatura",
      },
      { status: 500 },
    );
  }
}
