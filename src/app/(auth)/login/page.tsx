"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm, type LoginFormValues } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { login, authError, authLoading, isAuthenticated } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Usa o hook de assinatura corretamente
  const { hasActivePlan, loading: subscriptionLoading } = require("@/hooks/use-subscription").useSubscription();

  useEffect(() => {
    if (!authLoading && isAuthenticated && !subscriptionLoading) {
      if (hasActivePlan) {
        router.replace("/agent-chat");
      } else {
        router.replace("/plans");
      }
    }
  }, [authLoading, isAuthenticated, subscriptionLoading, hasActivePlan, router]);

  const handleLogin = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password);
      setIsRedirecting(true);
      // O redirecionamento será feito pelo useEffect acima, que depende do estado de autenticação e assinatura
    } catch (error) {
      setIsRedirecting(false);
      throw error;
    }
  };

  const handleGoogle = async () => {
    const supabase = getSupabaseBrowserClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/agent-chat`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    setIsRedirecting(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            NutriChat
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Bem-vindo de volta
          </h1>
          <p className="max-w-lg text-sm text-slate-300 sm:text-base">
            Acesse o painel do agente inteligente e continue a conversa com seus
            pacientes.
          </p>
        </div>

        <AuthCard
          title="Acesse sua conta"
          subtitle="Informe suas credenciais ou conecte-se com o Google para entrar."
          footer={<span>Não tem conta?</span>}
          footerLink={{ href: "/register", label: "Criar conta" }}
        >
          <LoginForm
            onSubmit={handleLogin}
            onGoogle={handleGoogle}
            serverError={authError}
            isBusy={authLoading || isRedirecting}
          />
        </AuthCard>
      </div>
    </div>
  );
}
