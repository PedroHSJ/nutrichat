'use client';

import { useRef, useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import {
  CHATKIT_API_URL,
  CHATKIT_API_DOMAIN_KEY,
} from "./config";
import { useFacts, type FactAction } from "./useFacts";
import type { ColorScheme } from "./useColorSchema";
import { useAuth } from "@/context/AuthContext";
import { useAuthHeaders } from "@/hooks/use-auth-headers";
import { RouteGuard } from "@/components/RouteGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ChatKitPanelProps = {
  theme: ColorScheme;
  onWidgetAction: (action: FactAction) => Promise<void>;
  onResponseEnd: () => void;
  onThemeRequest: (scheme: ColorScheme) => void;
};

export function ChatKitPanel({
  theme,
  onWidgetAction,
  onResponseEnd,
  onThemeRequest,
}: ChatKitPanelProps) {
  const processedFacts = useRef(new Set<string>());

  // LOGS DE DIAGNÓSTICO
  console.log("[ChatKitPanel] Entrou no componente", { theme });
  console.log("[ChatKitPanel] Variáveis de ambiente", {
    CHATKIT_API_URL,
    CHATKIT_API_DOMAIN_KEY,
  });

  const chatkit = useChatKit({
    api: { url: CHATKIT_API_URL, domainKey: CHATKIT_API_DOMAIN_KEY },
    theme: {
      colorScheme: theme,
      color: {
        grayscale: {
          hue: 220,
          tint: 6,
          shade: theme === "dark" ? -1 : -4,
        },
        accent: {
          primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
          level: 1,
        },
      },
      radius: "round",
    },
    threadItemActions: {
      feedback: false,
    },
    onClientTool: async (invocation) => {
      console.log("[ChatKitPanel] onClientTool", invocation);
      if (invocation.name === "switch_theme") {
        const requested = invocation.params.theme;
        if (requested === "light" || requested === "dark") {
          if (process.env.NODE_ENV === "development") {
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
    onResponseEnd: () => {
      console.log("[ChatKitPanel] onResponseEnd");
      onResponseEnd();
    },
    onThreadChange: () => {
      console.log("[ChatKitPanel] onThreadChange");
      processedFacts.current.clear();
    },
    onError: ({ error }) => {
      console.error("[ChatKitPanel] ChatKit error", error);
      alert("ChatKit error: " + (error?.message || error));
    },
  });

  console.log("[ChatKitPanel] chatkit.control", chatkit.control);

  return (
    <div className="relative h-full w-full overflow-hidden border border-slate-200/60 bg-white shadow-card dark:border-slate-800/70 dark:bg-slate-900">
      <ChatKit control={chatkit.control} className="block h-full w-full" />
    </div>
  );
}

export default function AgentChatPage() {
  const { user } = useAuth();
  const authHeaders = useAuthHeaders();
  const [theme, setTheme] = useState<ColorScheme>('dark');

  const canAuthenticate = Boolean(authHeaders.Authorization);
    const { facts, refresh, performAction } = useFacts();
    const handleThemeChange = (scheme: ColorScheme) => {
      setTheme(scheme);
    }
    const WORKFLOW_ID = "wf_68f171e696088190b6593a65b43b40c70a73086338745800";
  return (
    <RouteGuard requiresPlan redirectToPlans>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <Card className="border-slate-800 bg-slate-900/70 backdrop-blur">
            <CardHeader className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-white">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    Agente Inteligente (ChatKit)
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Interface oficial do ChatKit alimentada pelo workflow{' '}
                    <span className="font-mono text-emerald-300">{WORKFLOW_ID}</span>.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-400 text-emerald-300 bg-emerald-400/10">
                  Workflow
                </Badge>
              </div>
              {user?.name && (
                <p className="text-xs text-slate-400">
                  Autenticado como <span className="font-medium text-slate-200">{user.name}</span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="relative h-full w-full overflow-hidden border border-slate-200/60 bg-white shadow-card dark:border-slate-800/70 dark:bg-slate-900">
                <ChatKitPanel
                  theme={theme}
                  onWidgetAction={performAction}
                  onResponseEnd={refresh}
                  onThemeRequest={handleThemeChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RouteGuard>
  );
}
