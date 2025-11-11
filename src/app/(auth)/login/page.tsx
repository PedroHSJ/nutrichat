"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <Button
          variant="ghost"
          className="absolute left-4 top-4 text-slate-400 hover:text-emerald-300"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para início
        </Button>

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
          <LoginForm />
        </AuthCard>
      </div>
    </div>
  );
}
