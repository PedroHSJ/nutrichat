"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";

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
  const { isAuthenticated, authLoading } = useAuth();
  const { loading: subscriptionLoading, hasActivePlan } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    // Aguardar carregamento da autenticação
    if (authLoading) return;

    // Se requer autenticação e não está autenticado
    if (redirectToLogin && !isAuthenticated) {
      router.push("/login");
      return;
    }
    console.log("RouteGuard: ", {
      requiresPlan,
      hasActivePlan,
      redirectToPlans,
    });
    // Se requer plano e ainda está carregando
    if (requiresPlan && subscriptionLoading) return;

    // Se requer plano e não tem plano ativo
    if (requiresPlan && !hasActivePlan && redirectToPlans) {
      router.push("/plans");
      return;
    }
  }, [
    authLoading,
    isAuthenticated,
    subscriptionLoading,
    hasActivePlan,
    requiresPlan,
    redirectToPlans,
    redirectToLogin,
    router,
  ]);

  // Mostrar loading enquanto verifica autenticação
  if (authLoading || (requiresPlan && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se não passou nas verificações, não renderizar o conteúdo
  if (redirectToLogin && !isAuthenticated) {
    return null;
  }

  if (requiresPlan && !hasActivePlan && redirectToPlans) {
    return null;
  }

  return <>{children}</>;
}
