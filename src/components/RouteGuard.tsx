"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";
import { Spinner } from "./ui/spinner";

interface RouteGuardProps {
  children: ReactNode;
  requiresAuth?: boolean; // Se true, requer autenticação
  requiresPlan?: boolean; // Se true, requer plano ativo
}

export function RouteGuard({
  children,
  requiresAuth = true,
  requiresPlan = false,
}: RouteGuardProps) {
  const { isAuthenticated, authLoading } = useAuth();
  const { subscriptionStatus, loading: subscriptionLoading } =
    useSubscription();
  const router = useRouter();

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!authLoading && requiresAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, requiresAuth, isAuthenticated, router]);

  // Redirecionar para plans se não tem plano ativo
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!requiresPlan) return;
    if (subscriptionLoading) return;

    // Aguardar até ter dados válidos (não apenas loading = false)
    if (!subscriptionStatus) return;

    const hasActivePlan =
      subscriptionStatus.subscriptionStatus === "active" ||
      subscriptionStatus.subscriptionStatus === "trialing";

    if (!hasActivePlan) {
      router.replace("/plans");
    }
  }, [requiresPlan, subscriptionLoading, subscriptionStatus, router]);

  if (process.env.NODE_ENV === "development") return <>{children}</>;

  // Aguardar carregamento da autenticação
  if (authLoading) {
    return null;
  }

  // Se requer autenticação e não está autenticado, não renderizar
  if (requiresAuth && !isAuthenticated) {
    return null;
  }

  // Se requer plano, aguardar carregamento e verificar
  if (requiresPlan) {
    // Aguardar carregamento da assinatura OU dados inválidos
    if (subscriptionLoading || !subscriptionStatus) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-background">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }

    const hasActivePlan =
      subscriptionStatus.subscriptionStatus === "active" ||
      subscriptionStatus.subscriptionStatus === "trialing";

    // Se não tem plano ativo, não renderizar (vai redirecionar)
    if (!hasActivePlan) {
      return null;
    }
  }

  return <>{children}</>;
}
