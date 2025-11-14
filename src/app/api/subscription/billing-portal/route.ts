import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/stripe";
import {
  getSupabaseBearerClient,
  getSupabaseServerClient,
} from "@/lib/supabase-server";
import { UserSubscriptionService } from "@/lib/subscription";

/**
 * POST /api/subscription/billing-portal
 * Cria uma sessão do Stripe Customer Portal para o usuário autenticado
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Token inválido ou expirado",
        },
        { status: 401 },
      );
    }

    // Verificar se o usuário tem assinatura ativa
    const userSubscription =
      await UserSubscriptionService.getUserActiveSubscription(user.id);

    const hasActivePlan =
      userSubscription?.status === "active" ||
      userSubscription?.status === "trialing";

    if (!hasActivePlan || !userSubscription?.stripe_customer_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "É necessário possuir uma assinatura ativa para gerenciar o método de pagamento.",
        },
        { status: 403 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/plans-manage`;

    const portalSession = await SubscriptionService.createBillingPortalSession(
      userSubscription.stripe_customer_id,
      returnUrl,
    );

    if (!portalSession.url) {
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível iniciar o portal de cobrança.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    console.error("[API] Erro ao criar sessão do billing portal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao criar sessão do portal de cobrança",
      },
      { status: 500 },
    );
  }
}
