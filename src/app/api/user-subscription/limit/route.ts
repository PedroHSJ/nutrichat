import { NextRequest } from "next/server";
import { UserSubscriptionService } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
      });
    }
    // Busca o limite diário
    const status = await UserSubscriptionService.canUserInteract(userId);
    return new Response(
      JSON.stringify({ dailyLimit: status?.dailyLimit ?? 0 }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500 }
    );
  }
}
