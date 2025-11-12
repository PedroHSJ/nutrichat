"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/PasswordResetForms";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <Button
          variant="ghost"
          className="absolute left-4 top-4 text-slate-400 hover:text-emerald-300"
          onClick={() => router.push("/login")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para login
        </Button>

        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            NutriChat
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Esqueceu sua senha?
          </h1>
          <p className="max-w-lg text-sm text-slate-300 sm:text-base">
            Informe seu email e enviaremos um link seguro para você definir uma
            nova senha.
          </p>
        </div>

        <AuthCard
          title="Recuperar acesso"
          subtitle="Vamos enviar o link para o mesmo email utilizado no cadastro."
          footer={<span>Lembrou a senha?</span>}
          footerLink={{ href: "/login", label: "Voltar para login" }}
        >
          <ForgotPasswordForm />
        </AuthCard>
      </div>
    </div>
  );
}
