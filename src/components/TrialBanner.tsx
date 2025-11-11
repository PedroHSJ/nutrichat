"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { Crown, Clock } from "lucide-react";

export default function TrialBanner() {
  const { subscriptionStatus } = useSubscription();

  if (!subscriptionStatus?.isTrialing) return null;

  // Calcular dias restantes se possível
  const getDaysRemaining = () => {
    if (subscriptionStatus?.trialEndsAt) {
      const endDate = new Date(subscriptionStatus.trialEndsAt);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return null;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white relative overflow-hidden z-50">
      <div className="flex items-center justify-center py-2 px-4">
        <div className="flex items-center space-x-2">
          <Crown className="h-4 w-4 text-yellow-300" />
          <span className="text-sm font-medium">
            ✨ Trial Premium Ativo
            {daysRemaining !== null && (
              <span className="ml-2 text-violet-200">
                <Clock className="inline h-3 w-3 mr-1" />
                {daysRemaining > 0
                  ? `${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"}`
                  : "Último dia!"}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
