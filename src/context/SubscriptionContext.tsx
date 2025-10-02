"use client";

import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { UserInteractionStatus } from '@/types/subscription';
import { useAuthHeaders } from '@/hooks/use-auth-headers';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscriptionStatus: UserInteractionStatus | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  hasActivePlan: boolean;
  hasAccess: boolean; // inclui trial como acesso válido
  isTrialing: boolean;
  trialEndsAt: Date | undefined;
  trialDaysRemaining: number | undefined;
  trialEndsAtFormatted: string | undefined;
  isFreePlan: boolean;
  remainingInteractions: number;
  dailyLimit: number;
  planName: string;
  trialEligible: boolean | undefined;
  trialAlreadyUsed: boolean | undefined;
}
// Contexto começa como undefined para detectarmos uso fora do provider
export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Hook interno que realmente busca e deriva o estado (não exportar)
function useProvideSubscription(): SubscriptionContextType {
  const { user, isAuthenticated } = useAuth();
  const authHeaders = useAuthHeaders();
  const [subscriptionStatus, setSubscriptionStatus] = useState<UserInteractionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Estados derivados
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | undefined>(undefined);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | undefined>(undefined);
  const [trialEndsAtFormatted, setTrialEndsAtFormatted] = useState<string | undefined>(undefined);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [remainingInteractions, setRemainingInteractions] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [planName, setPlanName] = useState('Sem plano');
  const [trialEligible, setTrialEligible] = useState<boolean | undefined>(undefined);
  const [trialAlreadyUsed, setTrialAlreadyUsed] = useState<boolean | undefined>(undefined);

  // Abort controller para evitar setState após unmount
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!isAuthenticated || !user) {
        setSubscriptionStatus(null);
        setLoading(false);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/subscription/status', { headers: authHeaders, signal: controller.signal });
        if (!response.ok) {
          throw new Error('Erro ao verificar status da assinatura');
        }
        const status = await response.json();
        setSubscriptionStatus(status);
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // ignorar abort
        const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar assinatura';
        setError(errorMessage);
        console.error('[useSubscription] Erro ao verificar status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    return () => abortRef.current?.abort();
  }, [user, isAuthenticated, authHeaders]);

  const refreshSubscription = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/status', {
        headers: authHeaders
      });
      
      if (!response.ok) {
        throw new Error('Erro ao verificar status da assinatura');
      }
      
      const status = await response.json();
      setSubscriptionStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar assinatura';
      setError(errorMessage);
      console.error('Erro ao atualizar status da assinatura:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalcular derivados quando subscriptionStatus muda
  useEffect(() => {
    if (!subscriptionStatus) {
      setHasActivePlan(false);
      setIsTrialing(false);
      setTrialEndsAt(undefined);
      setTrialDaysRemaining(undefined);
      setTrialEndsAtFormatted(undefined);
      setIsFreePlan(false);
      setRemainingInteractions(0);
      setDailyLimit(0);
      setPlanName('Sem plano');
      setTrialEligible(undefined);
      setTrialAlreadyUsed(undefined);
      return;
    }

    const _isTrialing = !!subscriptionStatus.isTrialing || subscriptionStatus.subscriptionStatus === 'trialing';
    const _trialEndsAt = subscriptionStatus.trialEndsAt ? new Date(subscriptionStatus.trialEndsAt) : undefined;
    let _trialDaysRemaining: number | undefined;
    if (_trialEndsAt) {
      const now = new Date();
      const diffMs = _trialEndsAt.getTime() - now.getTime();
      _trialDaysRemaining = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
    }
    const _hasActivePlan = !!(
      subscriptionStatus.canInteract &&
      ['active', 'trialing'].includes(subscriptionStatus.subscriptionStatus as string)
    );

    setIsTrialing(_isTrialing);
    setTrialEndsAt(_trialEndsAt);
    setTrialDaysRemaining(_trialDaysRemaining);
    setTrialEndsAtFormatted((subscriptionStatus as any)?.trialEndsAtFormatted);
    setHasActivePlan(_hasActivePlan);
    setIsFreePlan(subscriptionStatus.planType === 'free');
    setRemainingInteractions(subscriptionStatus.remainingInteractions || 0);
    setDailyLimit(subscriptionStatus.dailyLimit || 0);
    setPlanName(subscriptionStatus.planName || 'Sem plano');
    setTrialEligible((subscriptionStatus as any)?.trialEligible);
    setTrialAlreadyUsed((subscriptionStatus as any)?.trialAlreadyUsed);
  }, [subscriptionStatus]);

  const hasAccess = hasActivePlan || isTrialing;

  return {
    subscriptionStatus,
    loading,
    error,
    refreshSubscription,
    hasActivePlan,
    hasAccess,
    isTrialing,
    trialEndsAt,
    trialDaysRemaining,
    trialEndsAtFormatted,
    isFreePlan,
    remainingInteractions,
    dailyLimit,
    planName,
    trialEligible,
    trialAlreadyUsed
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useProvideSubscription();
  return React.createElement(SubscriptionContext.Provider, { value }, children);
}

// Hook público para consumir o contexto
export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription deve ser usado dentro de <SubscriptionProvider />');
  }
  return ctx;
}