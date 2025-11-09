import { NextResponse } from "next/server";
import { createAIProvider } from "@/lib/ai-providers";

export async function GET() {
  try {
    const aiProvider = createAIProvider();

    return NextResponse.json({
      provider: aiProvider.name,
      status: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      {
        provider: "Desconhecido",
        status: "error",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
