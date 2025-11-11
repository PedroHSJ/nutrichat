"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { CancelSubscriptionModal } from "@/components/CancelSubscriptionModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api";

export default function ManageSubscriptionPage() {
  const {
    subscriptionStatus,
    loading,
    refreshSubscription,
  } = useSubscription();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const handleModalCancel = async (type: "immediate" | "period") => {
    setShowCancelModal(false);
    await apiClient.cancelSubscription();
    await refreshSubscription();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case "canceled":
        return <Badge variant="destructive">Cancelada</Badge>;
      case "past_due":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Em Atraso</Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const hasActivePlan = subscriptionStatus?.subscriptionStatus === "active";

  if (!hasActivePlan) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Assinatura Ativa</CardTitle>
            <CardDescription>
              Você não possui uma assinatura ativa no momento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Assine um plano premium para aproveitar todos os recursos do
                NutriChat.
              </p>
              <Button asChild>
                <Link href="/plans">Ver Planos Disponíveis</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl space-y-6">
      <CancelSubscriptionModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancel={handleModalCancel}
        loadingCancel={false}
      />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Gerenciar Assinatura</h1>
        <p className="text-muted-foreground">
          Veja e gerencie os detalhes da sua assinatura
        </p>
      </div>

      {/* Status da Assinatura */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {subscriptionStatus?.planName}
            </CardTitle>
            {getStatusBadge(subscriptionStatus?.subscriptionStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Limite Diário
              </p>
              <p className="text-2xl font-bold">
                {subscriptionStatus?.dailyLimit}
              </p>
              <p className="text-sm text-muted-foreground">
                interações por dia
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Restantes Hoje
              </p>
              <p className="text-2xl font-bold">
                {subscriptionStatus?.remainingInteractions}
              </p>
              <p className="text-sm text-muted-foreground">até à meia-noite</p>
            </div>
          </div>

          {subscriptionStatus?.currentPeriodEnd && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Próxima cobrança
                </p>
                <p className="text-sm text-blue-700">
                  {new Date(
                    subscriptionStatus.currentPeriodEnd,
                  ).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Ações da Assinatura</CardTitle>
          <CardDescription>
            Gerencie sua assinatura e pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <CreditCard className="mr-2 h-4 w-4" />
            Atualizar Método de Pagamento
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <Calendar className="mr-2 h-4 w-4" />
            Histórico de Cobranças
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleCancelSubscription}
          >
            Cancelar Assinatura
          </Button>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Precisa de Ajuda?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Se você tiver dúvidas sobre sua assinatura ou precisar de suporte,
            estamos aqui para ajudar.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Central de Ajuda
            </Button>
            <Button variant="outline" size="sm">
              Contatar Suporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
