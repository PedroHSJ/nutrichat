"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";

export function SubscriptionStatus() {
  const {
    subscriptionStatus,
    loading,
    hasActivePlan,
    isFreePlan,
    remainingInteractions,
    dailyLimit,
    planName,
  } = useSubscription();
  const router = useRouter();

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        Carregando...
      </Badge>
    );
  }

  if (!subscriptionStatus) {
    return null;
  }

  // Usuário sem plano
  if (isFreePlan || !hasActivePlan) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/plans")}
        className="border-orange-200 text-orange-700 hover:bg-orange-50"
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Sem Plano
      </Button>
    );
  }

  // Usuário com plano ativo
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="border-green-200 text-green-700 bg-green-50"
      >
        <Crown className="h-3 w-3 mr-1" />
        {planName}
      </Badge>

      {dailyLimit > 0 && (
        <Badge variant="secondary" className="text-xs">
          {remainingInteractions}/{dailyLimit}
        </Badge>
      )}
    </div>
  );
}
