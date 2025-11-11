"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserInteractionStatus } from "@/types/subscription";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: subscriptionStatus,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["subscription-status", user?.id],
    queryFn: async (): Promise<UserInteractionStatus> => {
      const response = await apiClient.getSubscriptionStatus();
      return response.data;
    },
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000, // 1 minuto - dados considerados frescos
    gcTime: 10 * 60 * 1000, // 10 minutos - tempo no cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    // Deduplica automaticamente requisições simultâneas
    networkMode: "online",
  });

  const refreshSubscription = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["subscription-status", user?.id],
    });
  };

  return {
    subscriptionStatus: subscriptionStatus || null,
    loading,
    error: error instanceof Error ? error.message : null,
    refreshSubscription,
    hasActivePlan:
      subscriptionStatus?.planType !== "free" &&
      subscriptionStatus?.subscriptionStatus === "active",
    isFreePlan: subscriptionStatus?.planType === "free",
    remainingInteractions: subscriptionStatus?.remainingInteractions || 0,
    dailyLimit: subscriptionStatus?.dailyLimit || 0,
    planName: subscriptionStatus?.planName || "Sem plano",
  };
}
