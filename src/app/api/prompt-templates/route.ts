import { NextRequest, NextResponse } from "next/server";
import {
  promptTemplateCategories,
  promptTemplatePlanLabels,
  promptTemplatePlanOptions,
  templateMatchesPlan,
  type PromptTemplate,
  type PromptTemplateCategory,
  type PromptTemplatePlan,
} from "@/data/prompt-templates";
import { getSupabaseBearerClient } from "@/lib/supabase-server";
import { UserSubscriptionService } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuthContext = {
  userId: string;
  planType: string | null;
  hasActiveSubscription: boolean;
};

type CreateTemplatePayload = {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  keywords?: string[];
  planType?: string;
};

const ALLOWED_PLAN_TYPES = promptTemplatePlanOptions.map((plan) => plan.id);

function extractToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.replace("Bearer ", "") ?? null;
}

async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const token = extractToken(request);

  if (!token) {
    throw new Error("Token de acesso não fornecido");
  }

  const supabase = getSupabaseBearerClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Usuário não autenticado");
  }

  const interactionStatus = await UserSubscriptionService.canUserInteract(
    user.id,
  );

  const hasActiveSubscription = ["active", "trialing"].includes(
    interactionStatus.subscriptionStatus,
  );

  return {
    userId: user.id,
    planType: interactionStatus.planType ?? null,
    hasActiveSubscription,
  };
}

function mapDbTemplate(row: {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  keywords: string[] | null;
  plan_type: string;
  created_by: string | null;
}): PromptTemplate {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    content: row.content,
    category: row.category as PromptTemplateCategory,
    keywords: row.keywords ?? [],
    availableToPlans: [row.plan_type as PromptTemplatePlan],
    source: "custom",
    createdBy: row.created_by,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { hasActiveSubscription, planType } = await getAuthContext(request);

    // Usuário precisa ter uma assinatura ativa para visualizar templates
    if (!hasActiveSubscription) {
      return NextResponse.json(
        { templates: [], planType },
        { status: 200 },
      );
    }

    const targetPlans = planType
      ? [planType, "all"]
      : (["all"] as string[]);

    const { data, error } = await supabaseAdmin
      .from("custom_prompt_templates")
      .select(
        "id,title,description,content,category,keywords,plan_type,created_by",
      )
      .eq("is_active", true)
      .in("plan_type", targetPlans);

    if (error) {
      if ((error as { code?: string }).code === "42P01") {
        console.warn(
          "[PromptTemplates][GET] Tabela custom_prompt_templates ausente. Execute as migrações.",
        );
        return NextResponse.json({ templates: [], planType });
      }
      console.error("[PromptTemplates][GET] Erro ao buscar templates:", error);
      return NextResponse.json(
        { error: "Não foi possível carregar templates personalizados." },
        { status: 500 },
      );
    }

    const templates = (data ?? []).map(mapDbTemplate).filter((template) => {
      return templateMatchesPlan(template, planType ?? null);
    });

    return NextResponse.json({ templates, planType });
  } catch (error) {
    console.error("[PromptTemplates][GET] Falha inesperada:", error);
    return NextResponse.json(
      { error: "Erro ao carregar templates personalizados." },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, hasActiveSubscription } = await getAuthContext(request);

    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: "Você precisa ter um plano ativo para criar templates." },
        { status: 403 },
      );
    }

    const payload = (await request.json()) as CreateTemplatePayload;

    const title = payload.title?.trim() ?? "";
    const content = payload.content?.trim() ?? "";
    const category = payload.category?.trim() ?? "";
    const description = payload.description?.trim() ?? "";
    const planType = payload.planType?.trim() ?? "";
    const keywords =
      payload.keywords?.map((keyword) => keyword.trim()).filter(Boolean) ??
      [];

    const errors: string[] = [];

    if (title.length < 3) {
      errors.push("Título muito curto.");
    }
    if (content.length < 10) {
      errors.push("Conteúdo do template é obrigatório.");
    }
    const isValidCategory = promptTemplateCategories.some(
      (item) => item.id === category,
    );
    if (!isValidCategory) {
      errors.push("Categoria inválida.");
    }

    if (!ALLOWED_PLAN_TYPES.includes(planType as PromptTemplatePlan)) {
      errors.push("Plano de destino inválido.");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("custom_prompt_templates")
      .insert({
        title,
        description,
        content,
        category,
        keywords,
        plan_type: planType,
        created_by: userId,
      })
      .select(
        "id,title,description,content,category,keywords,plan_type,created_by",
      )
      .single();

    if (error) {
      if ((error as { code?: string }).code === "42P01") {
        console.warn(
          "[PromptTemplates][POST] Tabela custom_prompt_templates ausente. Execute as migrações.",
        );
        return NextResponse.json(
          {
            error:
              "Tabela de templates não encontrada. Aplique as migrações do banco.",
          },
          { status: 500 },
        );
      }
      console.error("[PromptTemplates][POST] Erro ao salvar template:", error);
      return NextResponse.json(
        { error: "Não foi possível salvar o template." },
        { status: 500 },
      );
    }

    const created = mapDbTemplate(data);
    const firstPlan = created.availableToPlans?.[0];
    const planLabel = firstPlan ? promptTemplatePlanLabels[firstPlan] : null;

    return NextResponse.json(
      {
        template: created,
        message: `Template criado para ${planLabel ?? "plano selecionado"}.`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[PromptTemplates][POST] Falha inesperada:", error);
    return NextResponse.json(
      { error: "Erro ao criar template personalizado." },
      { status: 401 },
    );
  }
}
