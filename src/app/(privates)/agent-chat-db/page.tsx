"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth } from "@/lib/fetchWIthAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ModeToggle } from "@/components/DarkModeToggle";
import { MessageSquare, Plus, X } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ChatPayload = {
  chatId: string | null;
  title: string | null;
  messages: ChatMessage[];
};

type ChatSummary = {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/40"
            : "bg-slate-800/70 text-slate-50 border border-slate-700"
        }`}
      >
        <div className="text-xs opacity-80 mb-1">
          {isUser ? "Você" : "Agente"}
        </div>
        {message.content}
      </div>
    </div>
  );
}

export default function AgentChatDbPage() {
  const { user } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  const loadChat = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth("/api/agent-chat/db");
        if (!response.ok) {
          throw new Error("Falha ao carregar conversas");
        }
        const data = (await response.json()) as ChatPayload;
        setChatId(data.chatId);
        setMessages(
          (data.messages || []).map((m) => ({
            ...m,
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content ?? {}, null, 2),
          }))
        );
      } catch (err) {
        console.error("[agent-chat-db] Falha ao buscar chat:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erro inesperado ao carregar histórico"
        );
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    []
  );

  const loadChatList = useMemo(
    () => async () => {
      setLoadingList(true);
      try {
        const response = await fetchWithAuth("/api/agent-chat/db?list=1");
        if (!response.ok) {
          throw new Error("Falha ao listar conversas");
        }
        const data = (await response.json()) as { chats: ChatSummary[] };
        setChats(data.chats || []);
      } catch (err) {
        console.error("[agent-chat-db] Falha ao listar chats:", err);
      } finally {
        setLoadingList(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user) {
      void loadChat();
      void loadChatList();
    }
  }, [user, loadChat, loadChatList]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetchWithAuth("/api/agent-chat/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, chatId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }

      setChatId(data.chatId);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          typeof data.message === "string"
            ? data.message
            : JSON.stringify(data.message ?? {}, null, 2),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("[agent-chat-db] Erro ao enviar mensagem:", err);
      setError(
        err instanceof Error ? err.message : "Erro inesperado ao enviar"
      );
    } finally {
      setSending(false);
      void loadChatList();
    }
  };

  const handleSelectChat = async (id: string) => {
    setChatId(id);
    setMessages([]);
    setError(null);
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/agent-chat/db?chatId=${id}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar conversa");
      }
      const data = (await response.json()) as ChatPayload;
      setChatId(data.chatId);
      setMessages(
        (data.messages || []).map((m) => ({
          ...m,
          content:
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content ?? {}, null, 2),
        }))
      );
      setShowSidebar(false);
      scrollToBottom();
    } catch (err) {
      console.error("[agent-chat-db] Falha ao carregar chat:", err);
      setError(
        err instanceof Error ? err.message : "Erro inesperado ao carregar"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setChatId(null);
    setMessages([]);
    setError(null);
  };

  return (
    <RouteGuard>
      <div className="relative flex min-h-screen flex-col bg-[#0f172a] text-slate-50 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.08),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.06),transparent_35%)]" />
        </div>
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                <MessageSquare className="size-5" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                  Olá! Sou o NutriChat Pro.
                </div>
                <p className="text-xs text-slate-400">
                  Como posso te auxiliar?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-white/5 text-slate-50 hover:bg-white/10"
                onClick={() => setShowSidebar((prev) => !prev)}
              >
                {showSidebar ? "Fechar histórico" : "Histórico"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-sky-500/20 text-emerald-50 hover:from-emerald-500/30 hover:to-sky-500/30"
                onClick={handleNewChat}
                disabled={sending || loading}
              >
                <Plus className="mr-1.5 size-4" />
                Nova conversa
              </Button>
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="relative mx-auto flex w-full flex-1 flex-col gap-4 px-3 py-4 overflow-hidden">
          {showSidebar && (
            <div className="absolute right-0 top-0 z-30 h-full w-full max-w-xs rounded-l-xl border border-white/10 bg-[#121c27] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="text-sm font-semibold">
                  Histórico de conversas
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-200"
                  onClick={() => setShowSidebar(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto px-3 py-3">
                {loadingList && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Spinner className="h-4 w-4" /> Carregando
                  </div>
                )}
                {chats.length === 0 && !loadingList ? (
                  <div className="text-xs text-slate-500">
                    Nenhuma conversa.
                  </div>
                ) : (
                  chats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => void handleSelectChat(c.id)}
                      className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                        c.id === chatId
                          ? "border-cyan-500/60 bg-cyan-500/5"
                          : "border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-cyan-300" />
                        <span className="font-medium line-clamp-1">
                          {c.title || "Conversa"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(
                          c.updated_at || c.created_at
                        ).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <Card className="relative flex h-[calc(100vh-100px)] flex-col border border-slate-800 bg-[#0b1623]/90 p-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-base font-semibold">
                  {chatId ? "Conversa ativa" : "Nova conversa"}
                </div>
                <p className="text-xs text-slate-400">
                  {chatId ? `ID: ${chatId}` : "Envie uma mensagem para iniciar"}
                </p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Spinner className="h-4 w-4" /> Carregando
                </div>
              )}
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto py-4 space-y-2 px-8"
            >
              {messages.length === 0 && !loading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-500/20 to-sky-500/20 text-cyan-200">
                    <MessageSquare className="size-6" />
                  </div>
                  <div className="text-base font-semibold">
                    Olá! Sou o NutriChat Pro.
                  </div>
                  <div className="text-xs text-slate-500">
                    Como posso te auxiliar?
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {sending && (
                    <div className="flex w-full justify-start mb-3">
                      <div className="max-w-[80%] flex flex-col gap-4 rounded-lg px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap bg-slate-800/70 text-slate-50 border border-slate-700">
                        <Spinner className="h-5 w-5" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && <div className="mb-3 text-sm text-red-400">{error}</div>}

            <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
              <Textarea
                placeholder="Pergunte aqui..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                className="border-slate-800 bg-[#0f172a] text-slate-50 placeholder:text-slate-500 rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={sending || loading}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Pressione Enter para enviar
                </span>
                <Button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-sky-500 text-white hover:from-emerald-400 hover:to-sky-400"
                >
                  Enviar
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </RouteGuard>
  );
}
