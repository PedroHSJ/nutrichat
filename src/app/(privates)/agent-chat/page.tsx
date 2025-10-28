"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { WORKFLOW_ID, CHATKIT_SESSION_ENDPOINT } from "./config";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

import type { ColorScheme } from "./useColorSchema";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import UserSubscriptionService from "@/lib/subscription";
import { Separator } from "@radix-ui/react-separator";
import { SubscriptionDetails } from "../plans/page";
import { useSubscription } from "@/hooks/use-subscription";

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
}: ChatKitPanelProps) {
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
      : "pending"
  );
  const [widgetInstanceKey] = useState(0);

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
      handleError as EventListener
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
            })
          );
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener("chatkit-script-loaded", handleLoaded);
      window.removeEventListener(
        "chatkit-script-error",
        handleError as EventListener
      );
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [scriptStatus, setErrorState]);

  const isWorkflowConfigured = Boolean(
    WORKFLOW_ID && !WORKFLOW_ID.startsWith("wf_replace")
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

  // const handleResetChat = useCallback(() => {
  //   processedFacts.current.clear();
  //   if (isBrowser) {
  //     setScriptStatus(
  //       window.customElements?.get("openai-chatkit") ? "ready" : "pending"
  //     );
  //   }
  //   setIsInitializingSession(true);
  //   setErrors(createInitialErrors());
  //   setWidgetInstanceKey((prev) => prev + 1);
  // }, []);

  const getClientSecret = useCallback(
    async (currentSecret: string | null) => {
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
              parseError
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
    [isWorkflowConfigured, setErrorState]
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: theme,
    },
    composer: {
      attachments: {
        enabled: true,
      },
    },
    threadItemActions: {
      feedback: false,
    },
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
      // Resetar o flag para garantir incremento em cada mensagem
      responseEndedRef.current = false;
      if (!responseStartedRef.current) {
        console.log(
          "Mensagem sendo enviada: operação customizada antes do envio"
        );
        responseStartedRef.current = true;
      }
      setErrorState({ integration: null, retryable: false });
    },
    onResponseEnd: () => {
      if (!responseEndedRef.current) {
        if (!user?.id) return;
        UserSubscriptionService.incrementInteractionUsage(user?.id);
        responseEndedRef.current = true;
      }
      onResponseEnd();
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

  const activeError = errors.session ?? errors.integration;
  const blockingError = errors.script ?? activeError;

  return (
    <div className="relative pb-8 flex h-[90vh] w-full rounded-2xl flex-col overflow-hidden bg-white shadow-sm transition-colors dark:bg-slate-900">
      {(blockingError || isInitializingSession) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
          <div className="flex flex-col items-center gap-2">
            <Spinner />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Carregando assistente...
            </span>
          </div>
        </div>
      )}
      <ChatKit
        key={widgetInstanceKey}
        control={chatkit.control}
        className={
          blockingError || isInitializingSession
            ? "pointer-events-none opacity-0"
            : "block h-full w-full"
        }
      />
    </div>
  );
}

function extractErrorDetail(
  payload: Record<string, unknown> | undefined,
  fallback: string
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
  const { user, logout, interactionStatus } = useAuth();
  const [theme, setTheme] = useState<ColorScheme>("light");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<number | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const handleThemeChange = (scheme: ColorScheme) => {
    setTheme(scheme);
  };
  const {
    subscriptionStatus,
    loading: subscriptionLoading,
    refreshSubscription,
  } = useSubscription();
  const workflowLabel = WORKFLOW_ID ?? "workflow nao configurado";
  const trialRemainingText = useMemo(() => {
    if (!interactionStatus?.isTrialing) {
      return null;
    }
    if (!interactionStatus.trialEndsAt) {
      return "Trial ativo";
    }
    const endDate = new Date(interactionStatus.trialEndsAt);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      return "PerAodo de teste expira hoje";
    }
    const dayMs = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil(diffMs / dayMs);
    if (diffDays <= 1) {
      return "Asltimo dia de teste";
    }
    return `${diffDays} dia${diffDays === 1 ? "" : "s"} de teste restantes`;
  }, [interactionStatus?.isTrialing, interactionStatus?.trialEndsAt]);

  const [dailyLimit, setDailyLimit] = useState<number>(0);
  useEffect(() => {
    const fetchDailyLimit = async () => {
      if (user?.id) {
        try {
          const status = await UserSubscriptionService.canUserInteract(user.id);
          console.log("[fetchDailyLimit] status:", status);
          setDailyLimit(status?.dailyLimit ?? 0);
        } catch (err) {
          console.error("[fetchDailyLimit] erro ao buscar dailyLimit:", err);
          setDailyLimit(0);
        }
      } else {
        setDailyLimit(0);
      }
    };
    fetchDailyLimit();
  }, [user?.id, subscriptionStatus]);

  useEffect(() => {
    fetchDailyUsage();
  }, [user?.id, dailyLimit]);

  const fetchDailyUsage = async () => {
    if (user?.id) {
      const usage = await UserSubscriptionService.getDailyUsage(user.id);
      console.log("[fetchDailyUsage] usage:", usage);
      setDailyUsage(usage?.interactions_used ?? null);
    } else {
      console.log("[fetchDailyUsage] user?.id não definido");
    }
  };
  useEffect(() => {
    console.log("[AgentChatPage] dailyUsage:", dailyUsage);
    console.log("[AgentChatPage] dailyLimit:", dailyLimit);
  }, [dailyUsage, dailyLimit]);
  const handleRefresh = async () => {
    await fetchDailyUsage();
  };

  const dailyInteractionBadgeColor = useMemo(() => {
    if (dailyUsage === null) return "bg-gray";
    if (dailyUsage === 0) {
      return "bg-emerald";
    }
    if (dailyLimit > 0 && dailyUsage === dailyLimit) {
      return "bg-red-100";
    }
    if (dailyLimit > 0 && dailyUsage / dailyLimit >= 0.8) {
      return "bg-yellow-300";
    }
    return "bg-gray";
  }, [dailyUsage, dailyLimit]);

  return (
    <div className="">
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
          {user?.id && (
            <Badge
              className={`rounded-md px-2 py-1 text-sm font-medium text-emerald-800 text-center pointer-events-none ${dailyInteractionBadgeColor}`}
            >
              Uso diário: {`${dailyUsage}/${dailyLimit}`}
            </Badge>
          )}
        </div>
      </header>

      <div className="w-full">
        <ChatKitPanel
          theme={theme}
          onWidgetAction={() => Promise.resolve()}
          onResponseEnd={handleRefresh}
          onThemeRequest={handleThemeChange}
        />
      </div>
    </div>
  );
}
