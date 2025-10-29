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
    // Incrementa o uso diário
    await UserSubscriptionService.incrementInteractionUsage(userId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500 }
    );
  }
}
