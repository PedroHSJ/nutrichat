import { NextRequest } from "next/server";
import { UserSubscriptionService } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("[usage/route] userId recebido:", userId);
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
      });
    }
    // Busca o uso diário
    const usage = await UserSubscriptionService.getDailyUsage(userId);
    console.log("[usage/route] Resultado getDailyUsage:", usage);
    return new Response(JSON.stringify(usage), { status: 200 });
  } catch (err) {
    console.error("[usage/route] Erro:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500 }
    );
  }
}
