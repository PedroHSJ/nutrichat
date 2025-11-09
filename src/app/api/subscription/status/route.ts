import { NextRequest, NextResponse } from "next/server";
import { UserSubscriptionService } from "@/lib/subscription";
import { getSupabaseBearerClient } from "@/lib/supabase-server";

/**
 * GET /api/subscription/status
 * Retorna o status da assinatura do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Extrair token do header Authorization
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
      error,
    } = await supabase.auth.getUser();

    console.log("User fetched for subscription status:", {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: error?.message,
    });

    if (error || !user) {
      console.log("❌ Authentication failed:", error?.message);
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 },
      );
    }

    console.log("✅ User authenticated successfully:", user.email);

    // Obter status completo do usuário
    const interactionStatus = await UserSubscriptionService.canUserInteract(
      user.id,
    );

    // Retornar status no formato UserInteractionStatus
    return NextResponse.json(interactionStatus);
  } catch (error) {
    console.error("[API] Erro ao buscar status da assinatura:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao carregar status da assinatura",
      },
      { status: 500 },
    );
  }
}
