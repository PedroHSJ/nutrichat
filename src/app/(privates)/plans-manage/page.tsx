"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { RouteGuard } from "@/components/RouteGuard";
import { CancelSubscriptionModal } from "@/components/CancelSubscriptionModal";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthHeaders } from "@/hooks/use-auth-headers";
import type { UserInteractionStatus } from "@/types/subscription";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  LogOutIcon,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

type PlanMenuSection = "overview" | "change" | "billing" | "cancel";

export type PlanOption = {
  type: string;
  name: string;
  dailyLimit: number;
  priceId: string;
  productId: string;
  priceCents: number;
  currency: string;
  priceFormatted: string;
  features: string[];
};

export type SubscriptionDetails = Omit<
  UserInteractionStatus,
  "currentPeriodEnd" | "resetTime" | "trialEndsAt"
> & {
  currentPeriodEnd?: Date;
  resetTime?: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd?: boolean;
  hasSubscription?: boolean;
};

const menuItems: Array<{
  id: PlanMenuSection;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    id: "overview",
    label: "Visao geral",
    description: "Resumo do plano vigente",
    icon: Crown,
  },
  {
    id: "change",
    label: "Alterar plano",
    description: "Compare e escolha outro plano",
    icon: RefreshCcw,
  },
  {
    id: "billing",
    label: "Cobrancas e faturas",
    description: "Detalhes de pagamento e ciclo",
    icon: CreditCard,
  },
  {
    id: "cancel",
    label: "Cancelar plano",
    description: "Encerrar assinatura com seguranca",
    icon: ShieldCheck,
  },
];

function formatDate(value?: Date) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatCurrency(priceInCents: number, currency: string) {
  const currencyCode = currency?.toUpperCase() || "BRL";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(priceInCents / 100);
}

function formatResetTime(value?: Date) {
  if (!value) {
    return "em breve";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "em breve";
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = parsed.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (parsed.toDateString() === now.toDateString()) {
    return `hoje as ${time}`;
  }

  if (parsed.toDateString() === tomorrow.toDateString()) {
    return `amanha as ${time}`;
  }

  return `${parsed.toLocaleDateString("pt-BR")} as ${time}`;
}

export function normalizeStatus(
  status: UserInteractionStatus | null
): SubscriptionDetails | null {
  if (!status) {
    return null;
  }

  return {
    ...status,
    currentPeriodEnd: status.currentPeriodEnd
      ? new Date(status.currentPeriodEnd)
      : undefined,
    resetTime: status.resetTime ? new Date(status.resetTime) : undefined,
    trialEndsAt: status.trialEndsAt ? new Date(status.trialEndsAt) : undefined,
    cancelAtPeriodEnd:
      "cancelAtPeriodEnd" in status
        ? Boolean((status as Record<string, unknown>).cancelAtPeriodEnd)
        : undefined,
  };
}

const FallbackMessage =
  "Nao foi possivel processar a solicitacao. Tente novamente em instantes.";

export default function PlansManagementPage() {
  const [activeSection, setActiveSection] =
    useState<PlanMenuSection>("overview");
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { logout } = useAuth();
  const {
    subscriptionStatus,
    loading: subscriptionLoading,
    refreshSubscription,
  } = useSubscription();
  const authHeaders = useAuthHeaders();

  const effectiveStatus = useMemo(
    () => subscriptionDetails ?? normalizeStatus(subscriptionStatus ?? null),
    [subscriptionDetails, subscriptionStatus]
  );

  const trialLabel = useMemo(() => {
    if (!effectiveStatus?.isTrialing) {
      return null;
    }
    if (!effectiveStatus.trialEndsAt) {
      return "Periodo de teste ativo";
    }

    const diff = effectiveStatus.trialEndsAt.getTime() - new Date().getTime();
    if (diff <= 0) {
      return "Periodo de teste termina hoje";
    }

    const dayMs = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil(diff / dayMs);
    if (diffDays <= 1) {
      return "Ultimo dia de teste";
    }
    return `${diffDays} dia${diffDays === 1 ? "" : "s"} restantes no teste`;
  }, [effectiveStatus?.isTrialing, effectiveStatus?.trialEndsAt]);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!authHeaders.Authorization) {
      setStatusLoading(false);
      return;
    }

    try {
      setStatusLoading(true);
      setStatusError(null);

      const response = await fetch("/api/subscription/status", {
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error ?? "Nao foi possivel carregar sua assinatura"
        );
      }

      setSubscriptionDetails(normalizeStatus(data));
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : FallbackMessage);
    } finally {
      setStatusLoading(false);
    }
  }, [authHeaders]);

  const fetchPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      setPlansError(null);

      const response = await fetch("/api/subscription/plans");
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error ?? "Nao foi possivel carregar os planos disponiveis"
        );
      }

      setPlans(data.plans as PlanOption[]);
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : FallbackMessage);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const planName = effectiveStatus?.planName ?? "Sem plano";
  const planType = effectiveStatus?.planType ?? "free";
  const dailyLimit = effectiveStatus?.dailyLimit ?? 0;
  const remainingInteractions = effectiveStatus?.remainingInteractions ?? 0;
  const usagePercentage =
    dailyLimit > 0
      ? Math.min(100, ((dailyLimit - remainingInteractions) / dailyLimit) * 100)
      : 0;
  const subscriptionState = effectiveStatus?.subscriptionStatus ?? "unpaid";
  const currentPeriodEnd =
    effectiveStatus?.currentPeriodEnd instanceof Date
      ? effectiveStatus.currentPeriodEnd
      : undefined;
  const resetTime =
    effectiveStatus?.resetTime instanceof Date
      ? effectiveStatus.resetTime
      : undefined;
  const isCancelScheduled = Boolean(
    (subscriptionDetails as SubscriptionDetails | null)?.cancelAtPeriodEnd
  );
  const isPaidPlan = planType !== "free";

  const handlePlanSelection = async (plan: PlanOption) => {
    if (!plan.priceId) {
      setActionError(
        "Este plano ainda nao esta habilitado para checkout. Tente outra opcao ou fale com o suporte."
      );
      return;
    }

    if (plan.type === planType) {
      return;
    }

    if (!authHeaders.Authorization) {
      setActionError("Sessao expirada. Faca login novamente para continuar.");
      return;
    }

    if (isPaidPlan && subscriptionState === "active") {
      setActionError(
        "Para migrar de plano, encerre a assinatura atual e depois selecione o novo plano desejado."
      );
      setActiveSection("cancel");
      return;
    }

    try {
      setProcessingAction(true);
      setActionError(null);
      setActionMessage(null);

      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.priceId,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false || !data.checkoutUrl) {
        throw new Error(
          data?.error ??
            "Nao foi possivel iniciar o processo de alteracao de plano."
        );
      }

      window.location.href = data.checkoutUrl as string;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : FallbackMessage);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelSubscription = async (mode: "immediate" | "period") => {
    setLoadingCancel(true);
    if (!authHeaders.Authorization) {
      setActionError("Sessao expirada. Faca login novamente para continuar.");
      setLoadingCancel(false);
      return;
    }

    try {
      setProcessingAction(true);
      setActionError(null);
      setActionMessage(null);

      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: mode }),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error ?? "Nao foi possivel cancelar sua assinatura."
        );
      }

      setActionMessage(
        data?.message ??
          "Sua assinatura foi cancelada. Voce pode reativa-la quando quiser."
      );
      await fetchSubscriptionStatus();
      await refreshSubscription();

      // Aguarda 2 segundos, faz logout e redireciona para a raiz
      setTimeout(async () => {
        await logout();
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : FallbackMessage);
      setLoadingCancel(false);
    } finally {
      setProcessingAction(false);
      setShowCancelModal(false);
      setLoadingCancel(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <Card className="border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-foreground">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-2xl ">{planName}</CardTitle>
              <CardDescription>
                Plano vinculado a sua conta NutriChat.
              </CardDescription>
              {trialLabel && (
                <Badge className="mt-3 inline-flex w-fit items-center gap-2 border border-indigo-400/50 bg-indigo-500/15">
                  <Sparkles className="h-3.5 w-3.5" />
                  {trialLabel}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Badge className="border border-emerald-400 bg-emerald-500/10 text-foreground">
              {subscriptionState === "active" ? "Ativa" : subscriptionState}
            </Badge>
            <Badge variant="outline" className="border-slate-600 ">
              Plano {planType === "free" ? "gratuito" : planType}
            </Badge>
            {isCancelScheduled && (
              <Badge className="border border-amber-400 bg-amber-500/10 text-amber-200">
                Cancelamento programado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 p-4">
            <p className="text-sm text-primary">Status</p>
            <p className="mt-2 flex items-center gap-2 font-semibold ">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              {subscriptionState === "active" ? "Ativo" : subscriptionState}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 p-4">
            <p className="text-sm text-primary">Proxima renovacao</p>
            <p className="mt-2 flex items-center gap-2 text-base font-semibold ">
              <Calendar className="h-5 w-5 text-emerald-400" />
              {formatDate(currentPeriodEnd)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 p-4">
            <p className="text-sm text-primary">Interacoes diarias</p>
            <p className="mt-2 flex items-center gap-2 text-base font-semibold ">
              <Clock className="h-5 w-5 text-emerald-400" />
              {dailyLimit > 0 ? `${dailyLimit} por dia` : "Sem limite"}
            </p>
          </div>
        </CardContent>
      </Card>

      {dailyLimit > 0 && (
        <Card className="border ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base ">
              <ArrowLeftRight className="h-4 w-4 text-emerald-300" />
              Consumo do dia
            </CardTitle>
            <CardDescription>
              Acompanhe as interacoes utilizadas e o horario do proximo reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>Uso diario</span>
                <span>
                  {dailyLimit - remainingInteractions}/{dailyLimit}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-400">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usagePercentage >= 95
                      ? "bg-rose-500"
                      : usagePercentage >= 75
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  )}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>{remainingInteractions} restantes hoje</span>
                <span>Reseta {formatResetTime(resetTime)}</span>
              </div>
            </div>
            {planType === "free" && (
              <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-50">
                <AlertTitle>Precisando de mais interacoes?</AlertTitle>
                <AlertDescription>
                  Faca upgrade para um plano premium e multiplique sua cota
                  diaria.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderPlanCard = (plan: PlanOption) => {
    const isCurrentPlan = plan.type === planType;
    const hasPriceId = Boolean(plan.priceId);

    return (
      <Card
        key={`${plan.type}-${plan.priceId}`}
        className={cn(
          "flex flex-col justify-between border",
          isCurrentPlan && "border-emerald-500/50 shadow-emerald-500/10"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg ">
                {plan.name}
                {isCurrentPlan && <Badge className="border">Plano atual</Badge>}
              </CardTitle>
              <CardDescription>
                {plan.dailyLimit > 0
                  ? `${plan.dailyLimit} interacoes/dia`
                  : "Interacoes ilimitadas"}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold ">
                {plan.priceFormatted ??
                  formatCurrency(plan.priceCents, plan.currency)}
              </p>
              <p className="text-xs">por mes</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          {plan.features?.length > 0 && (
            <ul className="space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li
                  key={`${plan.type}-${feature}`}
                  className="flex items-start gap-2"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant={"default"}
            className={cn(
              "w-full",
              (!hasPriceId || isCurrentPlan) && "cursor-not-allowed"
            )}
            disabled={isCurrentPlan || !hasPriceId || processingAction}
            onClick={() => handlePlanSelection(plan)}
          >
            {isCurrentPlan
              ? "Plano em uso"
              : !hasPriceId
              ? "Indisponivel no momento"
              : subscriptionState === "active" && isPaidPlan
              ? "Cancelar plano atual para alterar"
              : "Selecionar plano"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderChange = () => (
    <div className="py-4 space-y-6">
      <Card className="border ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base ">
            <ArrowLeftRight className="h-4 w-4 text-emerald-300" />
            Alterar plano
          </CardTitle>
          <CardDescription>
            Compare as opcoes e selecione o plano que melhor atende a sua
            operacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPaidPlan && subscriptionState === "active" && (
            <Alert className="border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ja existe uma assinatura ativa</AlertTitle>
              <AlertDescription>
                Para migrar de plano, finalize primeiro a assinatura atual.
                Depois volte a esta tela para contratar o novo plano desejado.
              </AlertDescription>
            </Alert>
          )}
          {plansError && (
            <Alert variant="destructive">
              <AlertTitle>Nao foi possivel carregar os planos</AlertTitle>
              <AlertDescription>{plansError}</AlertDescription>
            </Alert>
          )}
          {plansLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm">
                Carregando opcoes de plano...
              </span>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {[...plans]
                .sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))
                .map(renderPlanCard)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border ">
        <CardHeader>
          <CardTitle className="text-base ">Precisa de ajuda?</CardTitle>
          <CardDescription>
            Fale com nossa equipe para ajustes customizados de limites ou
            faturamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="mailto:suporte@nutrichat.com.br">
              Contato com suporte
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/faq">Central de ajuda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <Card className="border ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base ">
            <CreditCard className="h-4 w-4 text-emerald-300" />
            Cobrancas e ciclo
          </CardTitle>
          <CardDescription>
            Confira os principais dados financeiros do seu plano atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide">Proxima cobranca</p>
            <p className="mt-2 text-lg font-semibold ">
              {formatDate(currentPeriodEnd)}
            </p>
            <p className="mt-1 text-xs">
              Renovacao automatica mantendo os beneficios ativos.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide">
              Status de pagamento
            </p>
            <p className="mt-2 text-lg font-semibold  capitalize">
              {subscriptionState == "active" ? "Ativo" : subscriptionState}
            </p>
            <p className="mt-1 text-xs">
              Caso note alguma divergencia, atualize seus dados de pagamento.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border ">
        <CardHeader>
          <CardTitle className="text-base ">
            Acoes relacionadas ao pagamento
          </CardTitle>
          <CardDescription>
            Ajuste informacoes financeiras ou consulte seu historico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={processingAction}
          >
            Atualizar metodo de pagamento
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={processingAction}
          >
            Consultar historico de cobrancas
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderCancel = () => (
    <div className="space-y-6">
      <Card className="border border-rose-500/30 bg-rose-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base ">
            <AlertTriangle className="h-4 w-4 text-rose-200" />
            Cancelar assinatura
          </CardTitle>
          <CardDescription>
            Encerrar a assinatura removera o acesso aos recursos premium ao
            final do ciclo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              Voce pode continuar usando o plano ate o fim do periodo ja pago.
            </li>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowCancelModal(true)}
              disabled={processingAction}
            >
              Cancelar assinatura
            </Button>
            <Button
              variant="outline"
              asChild
              size="sm"
              className="border-rose-500/40 hover:bg-rose-500/10"
            >
              <Link href="mailto:suspensoes@nutrichat.com.br">
                Falar com o suporte
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const isLoading = statusLoading || subscriptionLoading;

  return (
    <div className="">
      <CancelSubscriptionModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancel={() => handleCancelSubscription("immediate")}
        loadingCancel={loadingCancel}
      />

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as PlanMenuSection)}
        className="min-h-screen py-8"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <div>
            <h1 className="text-3xl font-semibold">Central de planos</h1>
            <p className="mt-2 text-sm text-slate-500">
              Gerencie assinatura, cobrancas e upgrade em um so lugar.
            </p>
          </div>

          <TabsList className="flex flex-wrap gap-3 bg-transparent p-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className={cn(
                    "group flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:border-emerald-300 hover:bg-emerald-500/10",
                    "data-[state=active]:border-emerald-400 data-[state=active]:bg-emerald-500/15 data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/20"
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-data-[state=active]:bg-emerald-500/20 group-data-[state=active]:text-emerald-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-1 flex-col justify-center">
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-500">
                      {item.description}
                    </span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {actionMessage && (
              <Alert className="mb-4 border border-emerald-500/30 bg-emerald-500/10">
                <AlertTitle>Processo concluido</AlertTitle>
                <AlertDescription>{actionMessage}</AlertDescription>
              </Alert>
            )}
            {actionError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Ops! Algo nao saiu como esperado</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            {statusError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>
                  Nao foi possivel carregar sua assinatura
                </AlertTitle>
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-sm text-slate-600">
                  Carregando dados da assinatura...
                </p>
              </div>
            ) : (
              <>
                <TabsContent value="overview" className="mt-0">
                  {renderOverview()}
                </TabsContent>
                <TabsContent value="change" className="mt-0">
                  {renderChange()}
                </TabsContent>
                <TabsContent value="billing" className="mt-0">
                  {renderBilling()}
                </TabsContent>
                <TabsContent value="cancel" className="mt-0">
                  {renderCancel()}
                </TabsContent>
              </>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
