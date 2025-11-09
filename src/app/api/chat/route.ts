import { NextRequest, NextResponse } from "next/server";
import { createAIProvider } from "@/lib/ai-providers";
import {
  withChatGuard,
  incrementInteractionUsage,
} from "@/lib/subscription-guard";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `Você é um assistente especializado em nutrição, focado em ajudar nutricionistas de produção. Forneça respostas precisas, práticas e baseadas em evidências científicas sobre nutrição, planejamento de refeições, requisitos nutricionais, segurança alimentar e gestão de produção alimentar.`;

// Função para obter usuário autenticado do cabeçalho
async function getAuthenticatedUser(request: NextRequest) {
  // Em desenvolvimento, permitir usuário simulado
  if (process.env.NODE_ENV === "development") {
    console.log("[DEV MODE] Using simulated user for chat");
    return {
      id: "dev_user_" + Date.now(),
      email: "dev@example.com",
      name: "Dev User",
    };
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  // Verificar token com Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email!,
    };
  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
    return null;
  }
}

async function chatHandler(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });
    }

    // Obter usuário autenticado
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 },
      );
    }

    // Criar o provider de IA baseado na configuração
    const aiProvider = createAIProvider();
    console.log(
      `[CHAT] Usando provider: ${aiProvider.name} para usuário: ${user.id}`,
    );

    try {
      // Processar mensagem com IA
      const assistantMessage = await aiProvider.sendMessage(
        message,
        SYSTEM_PROMPT,
      );

      // INCREMENTAR USO APÓS SUCESSO
      try {
        await incrementInteractionUsage(user.id);
        console.log(`[CHAT] Interação registrada para usuário: ${user.id}`);
      } catch (usageError) {
        console.error("[CHAT] Erro ao registrar uso:", usageError);
        // Em desenvolvimento, não falhar por erro de registro
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Erro ao registrar uso da interação" },
            { status: 500 },
          );
        }
      }

      return NextResponse.json({
        message: assistantMessage,
        provider: aiProvider.name,
        timestamp: new Date().toISOString(),
      });
    } catch (providerError: unknown) {
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : "Erro desconhecido";
      console.error(`[CHAT] Erro do ${aiProvider.name}:`, providerError);
      return NextResponse.json(
        {
          error: `Erro na comunicação com ${aiProvider.name}: ${errorMessage}`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[CHAT] Erro no servidor:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// APLICAR GUARD DE ASSINATURA
export const POST = withChatGuard(chatHandler);
