"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RouteGuardProps {
  children: ReactNode;
  requiresPlan?: boolean; // Se true, requer um plano ativo
  redirectToPlans?: boolean; // Se true, redireciona para planos se não tiver
  redirectToLogin?: boolean; // Se true, redireciona para login se não autenticado
}

export function RouteGuard({
  children,
  requiresPlan = false,
  redirectToPlans = true,
  redirectToLogin = true,
}: RouteGuardProps) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const {
    loading: subscriptionLoading,
    hasActivePlan,
    subscriptionStatus,
  } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    if (subscriptionLoading) return;
    // Aguardar carregamento da autenticação
    if (authLoading) return;

    // Se requer autenticação e não está autenticado
    if (redirectToLogin && !isAuthenticated) {
      router.push("/login");
      return;
    }
    // Se não tem plano ativo, só pode acessar /plans
    if (requiresPlan && !hasActivePlan && redirectToPlans) {
      console.log("Redirecting to plans...");
      //router.push("/plans");
      return;
    }
    if (requiresPlan && subscriptionLoading) return;
  }, [
    authLoading,
    isAuthenticated,
    subscriptionLoading,
    hasActivePlan,
    requiresPlan,
    redirectToPlans,
    redirectToLogin,
    router,
    user,
  ]);

  // Renderiza o conteúdo imediatamente para manter transparente
  // As verificações de redirecionamento acontecem em background via useEffect
  if (authLoading || (requiresPlan && subscriptionLoading)) {
    return <>{children}</>;
  }

  // Se não passou nas verificações, não renderizar o conteúdo
  if (redirectToLogin && !isAuthenticated) {
    return (
      <Dialog open>
        <DialogContent
          className="text-center select-none"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Autenticação necessária
            </DialogTitle>
            <DialogDescription className="mb-4">
              Você precisa estar autenticado para acessar esta página.
            </DialogDescription>
          </DialogHeader>
          <button
            className="mt-2 px-4 py-2 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
            onClick={() => router.push("/login")}
          >
            Ir para login
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  if (requiresPlan && !hasActivePlan && redirectToPlans) {
    return (
      <Dialog open>
        <DialogContent
          className="text-center select-none"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-amber-700">
              Plano necessário
            </DialogTitle>
            <DialogDescription className="mb-4">
              Você precisa de um plano ativo para acessar esta funcionalidade.
            </DialogDescription>
          </DialogHeader>
          <button
            className="mt-2 px-4 py-2 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
            onClick={() => router.push("/plans")}
          >
            Ver planos disponíveis
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
