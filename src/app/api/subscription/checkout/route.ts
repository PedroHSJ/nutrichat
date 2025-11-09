import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/stripe";
import { UserSubscriptionService } from "@/lib/subscription";
import {
  getSupabaseBearerClient,
  getSupabaseServerClient,
} from "@/lib/supabase-server";

/**
 * POST /api/subscription/checkout
 * Cria uma sessão de checkout do Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    console.log("Authorization header:", !!authHeader);
    console.log("Token extracted:", !!token);

    if (!token) {
      console.log("❌ No token provided in Authorization header");
      return NextResponse.json(
        { success: false, error: "Token de acesso não fornecido" },
        { status: 401 },
      );
    }

    // Usar Bearer client em vez de Server client
    const supabase = getSupabaseBearerClient(token);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.error("User fetch error:", userError);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Token inválido ou expirado",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Price ID é obrigatório",
        },
        { status: 400 },
      );
    }
    // Verificar se o plano existe
    const planInfo = await SubscriptionService.getPlanByPriceId(priceId);
    if (!planInfo) {
      return NextResponse.json(
        {
          success: false,
          error: "Plano não encontrado",
        },
        { status: 404 },
      );
    }

    // Verificar se usuário já tem assinatura ativa no banco de dados
    const existingSubscription =
      await UserSubscriptionService.getUserActiveSubscription(user.id);
    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Você já possui uma assinatura ativa. Cancele sua assinatura atual antes de criar uma nova.",
        },
        { status: 409 },
      );
    }

    let customerId: string;

    // Criar ou obter customer no Stripe
    try {
      const customerEmail = user.email || "";
      const customerName =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email ||
        "Usuario";

      const customer = await SubscriptionService.createStripeCustomer(
        customerEmail,
        customerName,
      );
      customerId = customer.id;

      // CAMADA DE SEGURANÇA ADICIONAL: Verificar assinaturas ativas diretamente na Stripe
      const hasActiveStripeSubscription =
        await SubscriptionService.hasActiveStripeSubscription(customerId);
      if (hasActiveStripeSubscription) {
        console.error(
          "[API] Customer já possui assinatura ativa na Stripe:",
          customerId,
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "Já existe uma assinatura ativa vinculada a este cliente. Por favor, entre em contato com o suporte.",
          },
          { status: 409 },
        );
      }
    } catch (error) {
      console.error("[API] Erro ao criar customer:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar dados do cliente",
        },
        { status: 500 },
      );
    }

    // Criar sessão de checkout
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
    const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/subscription/canceled`;

    console.log("[DEBUG] URLs do checkout:");
    console.log("- Base URL:", baseUrl);
    console.log("- Success URL:", successUrl);
    console.log("- Cancel URL:", cancelUrl);

    const session = await SubscriptionService.createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
    );

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[API] Erro ao criar checkout:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    );
  }
}
