"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/PasswordResetForms";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { session, authLoading } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
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
            Defina uma nova senha
          </h1>
          <p className="max-w-lg text-sm text-slate-300 sm:text-base">
            Por segurança, utilize uma senha forte e inédita para sua conta.
          </p>
        </div>

        <AuthCard
          title="Atualizar senha"
          subtitle="Esta página só funciona através do link enviado para o seu email."
          footer={
            <span>
              Precisa de um novo link?{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-emerald-300 hover:text-emerald-200"
              >
                Clique aqui
              </Link>
              .
            </span>
          }
        >
          {authLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : session ? (
            <UpdatePasswordForm onSuccess={() => router.replace("/login")} />
          ) : (
            <Alert className="bg-red-950/20 border-rose-500/40 text-slate-100 text-left">
              <AlertTitle>Link inválido ou expirado</AlertTitle>
              <AlertDescription>
                Não conseguimos validar os dados de recuperação. Solicite um
                novo link de redefinição e tente novamente.
              </AlertDescription>
            </Alert>
          )}
        </AuthCard>
      </div>
    </div>
  );
}
