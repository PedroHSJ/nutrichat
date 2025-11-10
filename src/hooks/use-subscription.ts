"use client";

import { useState, useEffect } from "react";
import { UserInteractionStatus } from "@/types/subscription";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<UserInteractionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !user) {
        setSubscriptionStatus(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getSubscriptionStatus();
        const status = response.data;
        setSubscriptionStatus(status);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao verificar assinatura";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    checkSubscription();
  }, [isAuthenticated, user]);

  const refreshSubscription = async () => {
    if (!isAuthenticated || !user) {
      setSubscriptionStatus(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getSubscriptionStatus();
      const status = response.data;
      setSubscriptionStatus(status);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar assinatura";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    subscriptionStatus,
    loading,
    error,
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
