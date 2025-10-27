"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import {
  RegisterForm,
  type RegisterFormValues,
} from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, authError, authLoading, isAuthenticated } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/agent-chat");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleRegister = async (values: RegisterFormValues) => {
    try {
      await signUp(values.name ?? "", values.email, values.password);
      setIsRedirecting(true);
      router.replace("/agent-chat");
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            NutriChat
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Crie sua conta
          </h1>
          <p className="max-w-lg text-sm text-slate-300 sm:text-base">
            Prepare-se para acompanhar seus pacientes com o agente inteligente
            da NutriChat.
          </p>
        </div>

        <AuthCard
          title="Comece em poucos passos"
          subtitle="Informe seus dados ou utilize sua conta Google para agilizar o cadastro."
          footer={<span>Já tem conta?</span>}
          footerLink={{ href: "/login", label: "Fazer login" }}
        >
          <RegisterForm
            onSubmit={handleRegister}
            onGoogle={handleGoogle}
            serverError={authError}
            isBusy={authLoading || isRedirecting}
          />
        </AuthCard>
      </div>
    </div>
  );
}
