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
        console.log("useSubscription - status:", status);
        setSubscriptionStatus(status);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao verificar assinatura";
        setError(errorMessage);
        console.error("Erro ao verificar status da assinatura:", err);
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
      console.error("Erro ao atualizar status da assinatura:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!subscriptionStatus) return;
    console.log(
      "useSubscription - subscriptionStatus changed:",
      subscriptionStatus,
    );
  }, [subscriptionStatus]);

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
