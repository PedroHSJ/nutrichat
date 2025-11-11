import { NextRequest, NextResponse } from "next/server";
import { UserSubscriptionService } from "@/lib/subscription";
import { getSupabaseBearerClient } from "@/lib/supabase-server";

/**
 * GET /api/subscription/status
 * Retorna o status da assinatura do usuário autenticado
 */
export async function GET(request: NextRequest) {
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
