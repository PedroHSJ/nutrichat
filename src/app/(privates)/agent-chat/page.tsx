"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { WORKFLOW_ID, CHATKIT_SESSION_ENDPOINT } from "./config";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

import type { ColorScheme } from "./useColorSchema";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@radix-ui/react-separator";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";
import { RouteGuard } from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/fetchWIthAuth";
export type FactAction = {
  type: "save";
  factId: string;
  factText: string;
};

type ChatKitPanelProps = {
  theme: ColorScheme;
  onWidgetAction: (action: FactAction) => Promise<void>;
  onResponseEnd: () => void;
  onThemeRequest: (scheme: ColorScheme) => void;
};

type ErrorState = {
  script: string | null;
  session: string | null;
  integration: string | null;
  retryable: boolean;
};

const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

const createInitialErrors = (): ErrorState => ({
  script: null,
  session: null,
  integration: null,
  retryable: false,
});

export function ChatKitPanel({
  theme,
  onWidgetAction,
  onResponseEnd,
  onThemeRequest,
  isBlocked,
}: ChatKitPanelProps & {
  isBlocked: boolean;
}) {
  const processedFacts = useRef(new Set<string>());
  // Flags to prevent multiple logs per message
  const responseStartedRef = useRef(false);
  const responseEndedRef = useRef(false);
  const [errors, setErrors] = useState<ErrorState>(() => createInitialErrors());
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const isMountedRef = useRef(true);
  const [scriptStatus, setScriptStatus] = useState<
    "pending" | "ready" | "error"
  >(() =>
    isBrowser && window.customElements?.get("openai-chatkit")
      ? "ready"
      : "pending",
  );
  const [widgetInstanceKey] = useState(0);

  useEffect(() => {
    if (!errors) return;
    if (errors) toast.error("Erro ao iniciar sessão");
  }, [errors]);

  const setErrorState = useCallback((updates: Partial<ErrorState>) => {
    setErrors((current) => ({ ...current, ...updates }));
  }, []);
  const { user } = useAuth();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    let timeoutId: number | undefined;

    const handleLoaded = () => {
      if (!isMountedRef.current) {
        return;
      }
      setScriptStatus("ready");
      setErrorState({ script: null });
    };

    const handleError = (event: Event) => {
      console.error("Failed to load chatkit.js for some reason", event);
      if (!isMountedRef.current) {
        return;
      }
      setScriptStatus("error");
      const detail = (event as CustomEvent<unknown>)?.detail ?? "unknown error";
      setErrorState({ script: `Error: ${detail}`, retryable: false });
      setIsInitializingSession(false);
    };

    window.addEventListener("chatkit-script-loaded", handleLoaded);
    window.addEventListener(
      "chatkit-script-error",
      handleError as EventListener,
    );

    if (window.customElements?.get("openai-chatkit")) {
      handleLoaded();
    } else if (scriptStatus === "pending") {
      timeoutId = window.setTimeout(() => {
        if (!window.customElements?.get("openai-chatkit")) {
          handleError(
            new CustomEvent("chatkit-script-error", {
              detail:
                "ChatKit web component is unavailable. Verify that the script URL is reachable.",
            }),
          );
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener("chatkit-script-loaded", handleLoaded);
      window.removeEventListener(
        "chatkit-script-error",
        handleError as EventListener,
      );
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [scriptStatus, setErrorState]);

  const isWorkflowConfigured = Boolean(
    WORKFLOW_ID && !WORKFLOW_ID.startsWith("wf_replace"),
  );

  useEffect(() => {
    if (!isWorkflowConfigured && isMountedRef.current) {
      setErrorState({
        session: "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.",
        retryable: false,
      });
      setIsInitializingSession(false);
    }
  }, [isWorkflowConfigured, setErrorState]);

  const getClientSecret = useCallback(
    async (currentSecret: string | null) => {
      if (isBlocked) {
        throw new Error("Limite diário atingido");
      }
      if (isDev) {
        console.info("[ChatKitPanel] getClientSecret invoked", {
          currentSecretPresent: Boolean(currentSecret),
          workflowId: WORKFLOW_ID,
          endpoint: CHATKIT_SESSION_ENDPOINT,
        });
      }

      if (!isWorkflowConfigured) {
        const detail =
          "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: false });
          setIsInitializingSession(false);
        }
        throw new Error(detail);
      }

      if (isMountedRef.current) {
        if (!currentSecret) {
          setIsInitializingSession(true);
        }
        setErrorState({ session: null, integration: null, retryable: false });
      }

      try {
        const response = await fetch(CHATKIT_SESSION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflow: { id: WORKFLOW_ID },
            scope: { 
              user_id: user?.id ?? null  // <- envia ID do usuário autenticado
            },
            chatkit_configuration: {
              // enable attachments
              file_upload: {
                enabled: true,
              },
            },
          }),
        });

        const raw = await response.text();

        if (isDev) {
          console.info("[ChatKitPanel] createSession response", {
            status: response.status,
            ok: response.ok,
            bodyPreview: raw.slice(0, 1600),
          });
        }

        let data: Record<string, unknown> = {};
        if (raw) {
          try {
            data = JSON.parse(raw) as Record<string, unknown>;
          } catch (parseError) {
            console.error(
              "Failed to parse create-session response",
              parseError,
            );
          }
        }

        if (!response.ok) {
          const detail = extractErrorDetail(data, response.statusText);
          console.error("Create session request failed", {
            status: response.status,
            body: data,
          });
          throw new Error(detail);
        }

        const clientSecret = data?.client_secret as string | undefined;
        if (!clientSecret) {
          throw new Error("Missing client secret in response");
        }

        if (isMountedRef.current) {
          setErrorState({ session: null, integration: null });
        }

        return clientSecret;
      } catch (error) {
        console.error("Failed to create ChatKit session", error);
        const detail =
          error instanceof Error
            ? error.message
            : "Unable to start ChatKit session.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: false });
        }
        throw error instanceof Error ? error : new Error(detail);
      } finally {
        if (isMountedRef.current && !currentSecret) {
          setIsInitializingSession(false);
        }
      }
    },
    [isWorkflowConfigured, setErrorState, isBlocked, user?.id],
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: theme,
    },
    composer: {
      attachments: {
        enabled: true,
        maxSize: 5 * 1024 * 1024, // 5 MB
        accept: {
          "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
          "application/pdf": [".pdf"],
        },
        maxCount: 2,
      },
    },
    threadItemActions: {
      feedback: true
    },
    locale: "pt-BR",
    onClientTool: async (invocation: {
      name: string;
      params: Record<string, unknown>;
    }) => {
      if (invocation.name === "switch_theme") {
        const requested = invocation.params.theme;
        if (requested === "light" || requested === "dark") {
          if (isDev) {
            console.debug("[ChatKitPanel] switch_theme", requested);
          }
          onThemeRequest(requested);
          return { success: true };
        }
        return { success: false };
      }

      if (invocation.name === "record_fact") {
        const id = String(invocation.params.fact_id ?? "");
        const text = String(invocation.params.fact_text ?? "");
        if (!id || processedFacts.current.has(id)) {
          return { success: true };
        }
        processedFacts.current.add(id);
        void onWidgetAction({
          type: "save",
          factId: id,
          factText: text.replace(/\s+/g, " ").trim(),
        });
        return { success: true };
      }

      return { success: false };
    },
    onResponseStart: () => {
      responseEndedRef.current = false;
      console.log(
        "Mensagem sendo enviada: operação customizada antes do envio",
      );
      responseStartedRef.current = true;
      setErrorState({ integration: null, retryable: false });
    },
    onResponseEnd: async () => {
      // Incrementa o uso e atualiza o header apenas uma vez por resposta
      if (responseEndedRef.current) {
        // Já executado para esta resposta, ignora chamadas adicionais
        return;
      }
      responseEndedRef.current = true;
      if (user?.id) {
        try {
          console.log(
            "responseStartedRef.current:",
            responseStartedRef.current,
          );
          // Sempre incrementa, sem depender do flag
          console.log(
            "[ChatKitPanel] Incrementando uso para usuário:",
            user.id,
          );
          await fetchWithAuth("/api/user-subscription/increment", {
            method: "POST",
          });
        } catch (err) {
          console.error("Erro ao incrementar interação:", err);
        }
        // Chama o refresh para buscar o novo valor
        onResponseEnd();
      }
    },
    onThreadChange: () => {
      processedFacts.current.clear();
      responseStartedRef.current = false;
      responseEndedRef.current = false;
    },
    onError: ({ error }: { error: unknown }) => {
      console.error("ChatKit error", error);
    },
  });

  // Bloqueio visual e funcional do ChatKit se o usuário estiver bloqueado
  if (isBlocked) {
    return (
      <div className="pb-8 flex w-full flex-col items-center justify-center overflow-hidden bg-white shadow-sm transition-colors dark:bg-slate-900 rounded-b-2xl min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <span className="text-lg font-semibold text-red-600 dark:text-red-400">
            Limite diário atingido
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300 text-center max-w-md">
            Você atingiu o limite diário de interações. Aguarde até amanhã para
            novas mensagens ou faça upgrade do plano para continuar usando o
            chat.
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className=" flex w-full flex-col overflow-hidden bg-white shadow-sm transition-colors dark:bg-slate-900 rounded-b-2xl md:pb-8 pb-[95px]">
      {/* {isInitializingSession && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Carregando assistente...
            </span>
          </div>
        </div>
      )} */}
      {process.env.NODE_ENV !== "production" && (
        <Button
          onClick={async () => {
            await fetchWithAuth("/api/user-subscription/increment", {
              method: "POST",
            });
          }}
        >
          Incrementar uso
        </Button>
      )}
      <ChatKit key={widgetInstanceKey} control={chatkit.control} />
    </div>
  );
}

function extractErrorDetail(
  payload: Record<string, unknown> | undefined,
  fallback: string,
): string {
  if (!payload) {
    return fallback;
  }

  const error = payload.error;
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details === "object" && "error" in details) {
    const nestedError = (details as { error?: unknown }).error;
    if (typeof nestedError === "string") {
      return nestedError;
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      typeof (nestedError as { message?: unknown }).message === "string"
    ) {
      return (nestedError as { message: string }).message;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

export default function AgentChatPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ColorScheme>("light");
  const handleThemeChange = (scheme: ColorScheme) => {
    setTheme(scheme);
  };
  const fetchingRef = useRef(false);
  const { subscriptionStatus, loading, refreshSubscription } =
    useSubscription();
  // Replicando padrão da tela de planos: dailyLimit e remainingInteractions direto do subscriptionStatus
  const dailyLimit = subscriptionStatus?.dailyLimit ?? 0;
  const remainingInteractions = subscriptionStatus?.remainingInteractions ?? 0;
  // dailyUsage = interações já usadas no dia
  const dailyUsage = dailyLimit > 0 ? dailyLimit - remainingInteractions : 0;
  // Controle de bloqueio no componente pai
  const [isBlocked, setIsBlocked] = useState(false);
  useEffect(() => {
    if (dailyLimit > 0 && dailyUsage >= dailyLimit) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [dailyLimit, dailyUsage]);

  useEffect(() => {
    if (user?.id) {
      refreshSubscription();
    }
  }, [user?.id]);

  const dailyInteractionBadgeColor = useMemo(() => {
    if (dailyUsage === null) return "bg-gray";
    if (dailyUsage === 0) {
      return "bg-emerald";
    }
    if (dailyLimit > 0 && dailyUsage === dailyLimit) {
      return "bg-red-100";
    }
    if (dailyLimit > 0 && dailyUsage / dailyLimit >= 0.8) {
      return "bg-yellow-200 text-foreground border-yellow-400";
    }
    return "bg-gray";
  }, [dailyUsage, dailyLimit]);

  return (
    <RouteGuard requiresPlan>
      <div className="w-full h-screen flex flex-col overflow-hidden">
        {/* <header className="flex flex-col gap-4 px-6 py-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between border-b">
        <div className="flex items-start gap-3 sm:items-center">
          <SidebarTrigger className="" />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-primary">
              Agente Inteligente
            </h1>
            <p className="text-sm text-slate-300">
              Interface oficial do ChatKit disponivel para o seu plano.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <Badge className="mt-2 w-fit border-emerald-400 bg-emerald-500/10 text-emerald-300">
                Workflow{" "}
                <span className="font-mono text-xs">{workflowLabel}</span>
              </Badge>
            )}
            {trialRemainingText && (
              <Badge className="mt-2 flex w-fit items-center gap-2 border-violet-400 bg-violet-500/10 text-violet-200">
                <Clock className="h-3.5 w-3.5" />
                {trialRemainingText}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          {user?.name && (
            <div className="flex flex-col text-right text-xs">
              <span className="text-slate-400">Autenticado como</span>
              <span className="text-sm font-medium text-primary">
                {user.name}
              </span>
            </div>
          )}
        </div>
      </header> */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            {user?.id &&
              (dailyUsage === null ? (
                <Badge className="rounded-md px-2 py-1 text-sm font-medium text-emerald-800 text-center pointer-events-none bg-gray flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  Carregando uso...
                </Badge>
              ) : (
                <Badge
                  className={`rounded-md px-2 py-1 text-sm font-medium text-emerald-800 text-center pointer-events-none ${dailyInteractionBadgeColor}`}
                >
                  Uso diário: {`${dailyUsage}/${dailyLimit}`}
                </Badge>
              ))}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <ChatKitPanel
            theme={theme}
            onWidgetAction={() => Promise.resolve()}
            onResponseEnd={refreshSubscription}
            onThemeRequest={handleThemeChange}
            isBlocked={isBlocked}
          />
        </div>
      </div>
    </RouteGuard>
  );
}
