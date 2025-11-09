import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { UserSubscriptionService } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 },
      );
    }

    const usage = await UserSubscriptionService.getDailyUsage(auth.user.id);

    return NextResponse.json(usage, { status: 200 });
  } catch (error) {
    console.error("[user-subscription/usage] Unexpected error:", error);
    return NextResponse.json(
      { error: "Erro interno", details: String(error) },
      { status: 500 },
    );
  }
}
