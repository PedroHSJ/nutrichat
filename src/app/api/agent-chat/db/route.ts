import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  encryptSensitiveData,
  decryptSensitiveData,
} from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import {
  fileSearchTool,
  webSearchTool,
  Agent,
  AgentInputItem,
  Runner,
  withTrace,
} from "@openai/agents";

export const runtime = "nodejs";

const webSearchPreview = webSearchTool({
  searchContextSize: "medium",
});

const VECTOR_STORE_ID =
  process.env.OPENAI_VECTOR_STORE_ID || "vs_68f2a6147aa88191ba249d4b75a13b53";

const fileSearch = fileSearchTool([VECTOR_STORE_ID]);

const allypro = new Agent({
  name: "AllyPro",
  instructions: `# 🧠 System Prompt — Nutrichat (Clínica)
*Você é o Nutrichat — assistente profissional de Nutrição de Apoio Clínico.*
Atua como ferramenta técnica e educacional para nutricionistas, oferecendo respostas baseadas em fontes internas verificadas e referências oficiais de nutrição e gestão alimentar.

---

## 🔒 Regras de Segurança e Verificação (Obrigatórias)
- Não mencionar “arquivos enviados”. Trate todo o conteúdo interno como *vector storage* do Nutrichat.
- *Nunca* vazar nomes de arquivos, metadados ou trechos literais do vector storage.
- Nunca listar os arquivos que estão no vector storage.
- Toda afirmação deve ser *verificável* e baseada em *dados reais*.
- Se faltar informação suficiente, *indique claramente* e solicite o dado essencial.
- *Não* preencher lacunas com suposições.
- *Verifique internamente* cada afirmação antes de responder.
- Se a confiança for *< 90%, **marque como INCERTO* no início da resposta ou *não responda*.
- Não fornecer estatísticas, datas, nomes ou detalhes técnicos *sem verificação* explícita.
- Produzir *apenas* o que foi solicitado. *Sem* gentilezas, *sem* desculpas, *sem* linguagem emocional/empática.
- Apresentar informações de forma *clara, direta e objetiva*.
- *Evitar reformulações vagas*.
- *Não* incluir ofertas de ajuda adicionais.

**Etiqueta de Confiança**

* Quando a mensagem do usuário exigir **análise técnica mais profunda**, inicie a resposta com uma etiqueta de confiança na **primeira linha**:

* \`✅ Confiança [ALTA] — Análise técnica consistente.\` → use quando você estiver **muito seguro (>90%)** da resposta.
* \`⚠️ Confiança [INCERTA] — Revise criticamente antes de aplicar.\` → use quando houver **dúvida relevante** ou confiança **menor que 90%**.
* **Não** use essa etiqueta para:

* Saudações simples (ex.: “oi”, “boa tarde”).
* Perguntas triviais ou genéricas que não envolvam o domínio técnico do agente.
* Formato da resposta quando a etiqueta for usada:

1. Primeira linha: \`Confiança: ALTA\` **ou** \`Confiança: INCERTA\`
2. Linha em branco
3. Restante da resposta

---

## 🧩 Uso das Fontes de Conhecimento
1️⃣ Priorize as *fontes internas* (vector storage).
2️⃣ Use conhecimento geral ou a web apenas para *complementar lacunas*.
3️⃣ Finalize *todas as respostas* com a seção *Referências*:
   - Se forem internas: “Baseado nas fontes internas do Nutrichat.”
   - Se houver fontes externas: *adicione também os links* oficiais.

> *Sigilo de Fontes Internas: Ao citar fontes internas, **nunca* revele nomes de arquivos, IDs, trechos literais ou metadados. Utilize apenas a citação genérica acima.

---

### *Formato Obrigatório*
1️⃣ *RESUMO*  
Breve visão geral do cálculo, observações importantes e principais resultados.

2️⃣ *FICHA TÉCNICA (TABELA)*  
Colunas obrigatórias (use Markdown com “|”):  
*Ingrediente | Peso líquido por porção (g) | Peso bruto total (kg) | Peso a comprar (kg) | Preço por kg (R$) | Custo total (R$)*

3️⃣ *CÁLCULO DE CUSTOS (TABELA)*  
Mostre o custo total por ingrediente, o custo total geral e o custo por porção.

4️⃣ *LISTA DE COMPRAS (BOM)*  
Liste os ingredientes e quantidades ajustadas considerando as perdas.

5️⃣ *CHECKLIST HACCP*  
Liste *pelo menos 5* pontos críticos de controle, com:  
*Etapa | Risco controlado | Medida preventiva/corretiva | Exemplo de limite crítico (temperatura, tempo etc.)*

---

### *Parâmetros e Convenções*
- *Perdas padrão (caso não informadas):*
  - Arroz → *10 %*
  - Carnes → *8 %*
  - Legumes → *12 %*
- Use *duas casas decimais* e separador decimal “,”.
- Moeda: *R$ XX,XX*
- Unidades: *g, kg, L* (sem plural nem ponto).
- Apresente tabelas sempre com colunas *alinhadas* e nomes *exatos* dos cabeçalhos.
- Linguagem *técnica, objetiva e profissional*.

⚠️ *Aviso obrigatório:*  
“Todos os cálculos e prazos são estimativas. Confirme requisitos legais e sanitários locais e valide shelf-life com análises laboratoriais.”

---

## 🧍‍♀️ 2. Apoio Clínico
Forneça *orientações gerais e materiais de apoio* para o trabalho do nutricionista clínico, *sem prescrever dietas individualizadas*.
- Sugira perguntas de anamnese, exemplos de cardápios equilibrados e boas práticas baseadas em diretrizes oficiais.
- Utilize as fontes internas sempre que possível.
- Quando usar diretrizes externas, *cite a origem* nas *Referências*.
- Mantenha tom *profissional e científico* (*sem linguagem emocional/empática*).
- *Nunca* ofereça diagnóstico, prescrição ou tratamento *personalizado*.

---

## 🧾 Estilo Geral
- Sempre que possível, use *seções e tabelas*.
- Responda em *PT‑BR* por padrão (só altere o idioma se o usuário o fizer).
- Emojis podem ser usados *apenas* em títulos introdutórios, *nunca* dentro das tabelas.
- Mantenha *consistência visual* e *clareza* em todas as respostas.

---

## 🚫 Nunca
- Garantir *validade* ou *inocuidade* sem testes laboratoriais.
- Incluir informações *sem base confiável*.
- *Omitir* seções obrigatórias ou *simplificar* cálculos técnicos.
- *Revelar* nomes/trechos de conteúdos internos ou metadados.

---

## 📚 Sempre
- Estruturar de forma *completa, clara e organizada*.
- Preservar *tags internas* de fonte (ex.: [FONTE: Manual HACCP 2024]).
- Se faltar dado essencial (ex.: preço/kg), *pergunte antes; se o usuário não responder, use **padrões* e *sinalize claramente*.
- Finalizar *todas as respostas* com o formato:

*Referências*
* Baseado nas fontes internas do NutriPro 360.
* [Link externo, se aplicável]`,
  model: "o3-mini",
  tools: [fileSearch],
  modelSettings: {
    store: true,
    maxTokens: 500,
  },
});

async function runAgent(userMessage: string) {
  return withTrace("AllyPro", async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [{ type: "input_text", text: userMessage }],
      },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id:
          process.env.OPENAI_WORKFLOW_ID ||
          "wf_68f171e696088190b6593a65b43b40c70a73086338745800",
      },
    });

    let result;
    try {
      result = await runner.run(allypro, [...conversationHistory]);
    } catch (err) {
      const is429 =
        err &&
        typeof err === "object" &&
        "status" in err &&
        (err as { status?: number }).status === 429;
      const isMaxTurns =
        err instanceof Error &&
        err.message &&
        err.message.toLowerCase().includes("max turns");

      if (isMaxTurns) {
        console.warn(
          "[AGENT-CHAT/DB] Agente excedeu iterações; devolvendo fallback"
        );
        return "Não consegui concluir dentro do limite de iterações. Tente reformular ou seja mais direto.";
      }

      const message = is429
        ? "Limite de uso do modelo atingido. Tente novamente mais tarde ou ajuste seu plano/billing."
        : "Falha ao executar o agente";
      console.error("[AGENT-CHAT/DB] Erro ao rodar agente:", err);
      throw new Error(message);
    }

    if (!result.finalOutput) {
      throw new Error("Resposta do agente indefinida");
    }

    const finalText =
      typeof result.finalOutput === "string"
        ? result.finalOutput
        : JSON.stringify(result.finalOutput, null, 2);

    return finalText;
  });
}

// Autentica usuário a partir do header Authorization: Bearer <token>
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    console.error("[AGENT-CHAT/DB] Erro ao verificar autenticação:", error);
    return null;
  }
}

// Cria ou retorna um chat existente
async function ensureChat(userId: string, title: string, chatId?: string) {
  const client = supabaseAdmin;

  if (chatId) {
    const { data, error } = await client
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("user_id", userId)
      .single();

    if (error) {
      throw new Error("Chat não encontrado ou sem permissão");
    }
    return data.id as string;
  }

  const newId = crypto.randomUUID();
  const { encrypted: titleEncrypted, hash: titleHash } =
    await encryptSensitiveData(title || "Nova conversa");

  const { error } = await client.from("chats").insert({
    id: newId,
    user_id: userId,
    title_encrypted: titleEncrypted,
    title_hash: titleHash,
    message_count: 0,
  });

  if (error) {
    console.error("[AGENT-CHAT/DB] Erro ao criar chat:", error);
    throw new Error("Falha ao criar chat");
  }

  return newId;
}

async function saveMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string
) {
  const client = supabaseAdmin;
  const { encrypted: contentEncrypted, hash: contentHash } =
    await encryptSensitiveData(content);

  const { error } = await client.from("messages").insert({
    chat_id: chatId,
    role,
    content_encrypted: contentEncrypted,
    content_hash: contentHash,
  });

  if (error) {
    console.error("[AGENT-CHAT/DB] Erro ao salvar mensagem:", error);
    throw new Error("Falha ao salvar mensagem");
  }
}

// GET: retorna mensagens de um chat
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const client = supabaseAdmin;
    const listMode = request.nextUrl.searchParams.get("list") === "1";
    const chatId = request.nextUrl.searchParams.get("chatId");

    // Listar conversas (somente cabeçalhos)
    if (listMode) {
      const { data, error } = await client
        .from("chats")
        .select("id, title_encrypted, title_hash, updated_at, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[AGENT-CHAT/DB] Erro ao listar chats:", error);
        return NextResponse.json(
          { error: "Falha ao listar conversas" },
          { status: 500 }
        );
      }

      const chats =
        (await Promise.all(
          (data || []).map(async (c) => {
            let title = "Conversa";
            try {
              const decoded =
                (await decryptSensitiveData(
                  c.title_encrypted,
                  c.title_hash || ""
                )) || null;
              if (decoded) title = decoded;
            } catch (err) {
              console.error(
                "[AGENT-CHAT/DB] Erro ao descriptografar título:",
                err
              );
            }
            return {
              id: c.id,
              title,
              updated_at: c.updated_at,
              created_at: c.created_at,
            };
          })
        )) || [];

      return NextResponse.json({ chats });
    }

    // Buscar uma conversa específica (ou a mais recente)
    const chatQuery = client
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const { data: chat, error: chatErr } = chatId
      ? await client
          .from("chats")
          .select("*")
          .eq("id", chatId)
          .eq("user_id", user.id)
          .single()
      : await chatQuery.single();

    if (chatErr || !chat) {
      return NextResponse.json(
        { chatId: null, title: null, messages: [] },
        { status: 200 }
      );
    }

    const effectiveChatId = chat.id as string;

    const { data: messages, error: msgErr } = await client
      .from("messages")
      .select("*")
      .eq("chat_id", effectiveChatId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("[AGENT-CHAT/DB] Erro ao buscar mensagens:", msgErr);
      return NextResponse.json(
        { error: "Falha ao buscar mensagens" },
        { status: 500 }
      );
    }

    const decryptedMessages = [];
    for (const m of messages || []) {
      const content =
        (await decryptSensitiveData(
          m.content_encrypted,
          m.content_hash || ""
        )) || "[conteúdo indisponível]";
      decryptedMessages.push({
        id: m.id,
        role: m.role,
        content,
        created_at: m.created_at,
      });
    }

    const title =
      (await decryptSensitiveData(
        chat.title_encrypted,
        chat.title_hash || ""
      )) || "Conversa";

    return NextResponse.json({
      chatId: effectiveChatId,
      title,
      messages: decryptedMessages,
    });
  } catch (error) {
    console.error("[AGENT-CHAT/DB] Erro inesperado no GET:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar chat" },
      { status: 500 }
    );
  }
}

// POST: envia mensagem para o agente e persiste no banco
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const { message, chatId: providedChatId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });
    }

    const chatId = await ensureChat(user.id, message, providedChatId);

    // Envia para IA
    const assistantMessage = await runAgent(message);
    console.log("[AGENT-CHAT/DB] Resposta do agente:", assistantMessage);
    // Salva mensagem do usuário
    await saveMessage(chatId, "user", message);

    // Salva resposta da IA
    await saveMessage(chatId, "assistant", assistantMessage);

    // Atualiza contagem de mensagens e timestamp do chat
    const { count, error: countErr } = await supabaseAdmin
      .from("messages")
      .select("*", { head: true, count: "exact" })
      .eq("chat_id", chatId);

    if (countErr) {
      console.error("[AGENT-CHAT/DB] Erro ao contar mensagens:", countErr);
    } else {
      await supabaseAdmin
        .from("chats")
        .update({
          message_count: count ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);
    }

    return NextResponse.json({
      chatId,
      message: assistantMessage,
      provider: "AllyPro",
    });
  } catch (error) {
    console.error("[AGENT-CHAT/DB] Erro ao processar chat:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao processar chat";
    const status =
      typeof (error as { status?: number })?.status === "number"
        ? (error as { status?: number }).status
        : message.includes("Limite de uso") ||
            message.toLowerCase().includes("quota")
          ? 429
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
